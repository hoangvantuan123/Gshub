// Exercise the real Electron cookie store and production preload on file://.
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const assert = require('node:assert/strict')
const { pathToFileURL } = require('node:url')

if (!process.argv.includes('--electron-test')) {
  const { buildSync } = require('esbuild')
  const { spawnSync } = require('node:child_process')
  const root = path.resolve(__dirname, '..')
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'gshub-auth-test-'))
  const bundle = (entry, outfile, platform) =>
    buildSync({
      entryPoints: [path.join(root, entry)],
      outfile: path.join(scratch, outfile),
      bundle: true,
      platform,
      format: 'cjs',
      external: ['electron']
    })
  bundle('src/main/security/authCookies.js', 'main.cjs', 'node')
  bundle('src/preload/index.js', 'preload.cjs', 'node')
  buildSync({
    stdin: {
      contents: `export { default as cookies } from './src/renderer/src/utils/authCookies.js';
        export { accessToken, refreshToken } from './src/renderer/src/services/tokenService.js'`,
      resolveDir: root
    },
    outfile: path.join(scratch, 'renderer.js'),
    bundle: true,
    format: 'iife',
    globalName: 'AuthTest'
  })
  fs.writeFileSync(path.join(scratch, 'index.html'), '<!doctype html><title>Auth test</title>')
  fs.writeFileSync(path.join(scratch, 'untrusted.html'), '<!doctype html><title>Untrusted</title>')
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  for (const phase of ['write', 'read']) {
    const result = spawnSync(require('electron'), [__filename, '--electron-test', scratch, phase], {
      env,
      windowsHide: true,
      encoding: 'utf8',
      timeout: 60000
    })
    process.stdout.write(result.stdout || '')
    process.stderr.write(result.stderr || '')
    if (result.error) throw result.error
    assert.equal(result.status, 0, `Electron ${phase} phase failed`)
  }
  console.log(
    'PASS: file token storage, reload, restart, child windows, expiry, logout, sender validation and HTTP cookies'
  )
} else {
  const { app, BrowserWindow } = require('electron')
  const scratch = process.argv[process.argv.indexOf('--electron-test') + 1]
  const phase = process.argv[process.argv.indexOf('--electron-test') + 2]
  app.setPath('userData', path.join(scratch, 'profile'))
  app
    .whenReady()
    .then(async () => {
      const fileUrl = pathToFileURL(path.join(scratch, 'index.html')).href
      require(path.join(scratch, 'main.cjs')).setupAuthCookieIpc(() => fileUrl)
      const renderer = fs.readFileSync(path.join(scratch, 'renderer.js'), 'utf8')
      const open = async (url = fileUrl) => {
        const win = new BrowserWindow({
          show: false,
          webPreferences: {
            preload: path.join(scratch, 'preload.cjs'),
            contextIsolation: true,
            sandbox: true
          }
        })
        await win.loadURL(url)
        await win.webContents.executeJavaScript(renderer)
        return win
      }
      const run = (win, code) => win.webContents.executeJavaScript(code)
      const first = await open()
      if (phase === 'write') {
        assert.equal(
          await run(first, `document.cookie = 'a_a=unsupported; path=/'; document.cookie`),
          ''
        )
        await run(
          first,
          `AuthTest.cookies.set('a_a', 'test-access', { expires: 7 });
        AuthTest.cookies.set('r_t', 'test-refresh', { expires: 30 })`
        )
        assert.equal(await run(first, 'AuthTest.accessToken()'), 'test-access')
        await first.loadURL(fileUrl + '#/erp/u/home')
        await run(first, renderer)
        assert.equal(await run(first, 'AuthTest.refreshToken()'), 'test-refresh')
        const child = await open()
        assert.equal(await run(child, 'AuthTest.accessToken()'), 'test-access')
        assert.equal(
          await run(
            first,
            `try { window.electron.authCookie({ action: 'get', name: 'other' }); false } catch { true }`
          ),
          true
        )
        const untrusted = await open(pathToFileURL(path.join(scratch, 'untrusted.html')).href)
        assert.equal(
          await run(
            untrusted,
            `try { window.electron.authCookie({ action: 'get', name: 'a_a' }); false } catch { true }`
          ),
          true
        )
      } else {
        assert.equal(await run(first, 'AuthTest.accessToken()'), 'test-access')
        assert.equal(await run(first, 'AuthTest.refreshToken()'), 'test-refresh')
        const child = await open()
        await run(
          first,
          `AuthTest.cookies.set('a_a', 'expired', { expires: -1 }); AuthTest.cookies.remove('r_t', { path: '/' })`
        )
        assert.equal(await run(child, 'AuthTest.accessToken()'), null)
        assert.equal(await run(child, 'AuthTest.refreshToken()'), null)
        const server = require('node:http').createServer((req, res) =>
          res.end('<!doctype html><title>Web</title>')
        )
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
        const web = await open(`http://127.0.0.1:${server.address().port}/`)
        await run(web, `AuthTest.cookies.set('a_a', 'web-access', { expires: 7, path: '/' })`)
        assert.equal(await run(web, 'AuthTest.accessToken()'), 'web-access')
        await run(web, `AuthTest.cookies.remove('a_a', { path: '/' })`)
        assert.equal(await run(web, 'AuthTest.accessToken()'), null)
        server.close()
      }
      app.exit(0)
    })
    .catch((error) => {
      console.error(error)
      app.exit(1)
    })
}
