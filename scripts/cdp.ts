// A tiny Chrome DevTools Protocol client for the audit scripts: starts headless Chrome on its own port and
// profile, and offers evaluate / navigate / key presses. No browser-automation dependency.
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class Browser {
  private ws!: WebSocket
  private id = 0
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()
  private proc!: ChildProcess
  private profile!: string

  /** Starts Chrome on `port` (pick one nothing else uses: a taken port would drive someone else's browser). */
  static async launch(port: number, size = { width: 1280, height: 900 }): Promise<Browser> {
    const exe = CHROME_PATHS.find((p) => p && existsSync(p))
    if (!exe) throw new Error('Chrome not found: set CHROME_PATH')
    const b = new Browser()
    b.profile = mkdtempSync(join(tmpdir(), 'atlas-chrome-'))
    b.proc = spawn(exe, [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${b.profile}`,
      `--window-size=${size.width},${size.height}`,
      '--no-first-run',
      '--disable-gpu',
      'about:blank',
    ])
    let target: { webSocketDebuggerUrl: string } | undefined
    for (let i = 0; i < 100 && !target; i++) {
      await sleep(100)
      try {
        const list = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()) as any[]
        target = list.find((t) => t.type === 'page')
      } catch {
        /* not up yet */
      }
    }
    if (!target) throw new Error('Chrome did not start')
    b.ws = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((res, rej) => {
      b.ws.onopen = () => res(undefined)
      b.ws.onerror = () => rej(new Error('DevTools connection failed'))
    })
    b.ws.onmessage = (m) => {
      const msg = JSON.parse(String(m.data))
      const p = msg.id !== undefined ? b.pending.get(msg.id) : undefined
      if (!p) return
      b.pending.delete(msg.id)
      if (msg.error) p.reject(new Error(msg.error.message))
      else p.resolve(msg.result)
    }
    await b.send('Page.enable')
    await b.send('Runtime.enable')
    await b.send('Emulation.setDeviceMetricsOverride', { ...size, deviceScaleFactor: 1, mobile: false })
    return b
  }

  send(method: string, params: object = {}): Promise<any> {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  /** Evaluates an expression in the page (top-level await allowed) and returns its JSON value. */
  async eval<T = unknown>(expression: string): Promise<T> {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result.value as T
  }

  async goto(url: string, settleMs = 900) {
    await this.send('Page.navigate', { url })
    for (let i = 0; i < 100; i++) {
      await sleep(100)
      if ((await this.eval<string>('document.readyState')) === 'complete') break
    }
    await sleep(settleMs)
  }

  /** `media` is e.g. [{ name: 'prefers-reduced-motion', value: 'reduce' }]. */
  setMedia(features: { name: string; value: string }[]) {
    return this.send('Emulation.setEmulatedMedia', { features })
  }

  setViewport(width: number, height: number, mobile = false) {
    return this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
  }

  /** A real key press (keydown, then keyup), with the text the key types if it is a character. */
  async key(key: string, modifiers = 0) {
    const named: Record<string, { code: string; vk: number }> = {
      Tab: { code: 'Tab', vk: 9 },
      Enter: { code: 'Enter', vk: 13 },
      Escape: { code: 'Escape', vk: 27 },
      ArrowDown: { code: 'ArrowDown', vk: 40 },
      ArrowUp: { code: 'ArrowUp', vk: 38 },
      ArrowLeft: { code: 'ArrowLeft', vk: 37 },
      ArrowRight: { code: 'ArrowRight', vk: 39 },
      ' ': { code: 'Space', vk: 32 },
      Home: { code: 'Home', vk: 36 },
      End: { code: 'End', vk: 35 },
    }
    const n = named[key]
    const base = { key, modifiers, code: n?.code ?? `Key${key.toUpperCase()}`, windowsVirtualKeyCode: n?.vk ?? key.toUpperCase().charCodeAt(0) }
    // Enter produces a character too (carriage return): that is what makes a focused button click.
    const typed = (key.length === 1 || key === 'Enter') && !(modifiers & 6)
    await this.send('Input.dispatchKeyEvent', { type: typed ? 'keyDown' : 'rawKeyDown', ...base, ...(typed ? { text: key === 'Enter' ? '\r' : key } : {}) })
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
  }

  async type(text: string) {
    for (const ch of text) await this.key(ch)
  }

  close() {
    try {
      this.ws.close()
    } catch {
      /* already closed */
    }
    this.proc.kill()
    setTimeout(() => {
      try {
        rmSync(this.profile, { recursive: true, force: true })
      } catch {
        /* Chrome may still hold the profile */
      }
    }, 1000)
  }
}
