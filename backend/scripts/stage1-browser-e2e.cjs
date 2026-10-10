/*
 * Stage 1 release smoke: real React + Express + MySQL, without HTTP fixtures.
 * Prepare the guarded, seeded _test database with `npm run test:coverage` first.
 * Never run this alongside a test runner that resets that database.
 * Usage: node backend/scripts/stage1-browser-e2e.cjs
 * Optional: PLAYWRIGHT_MODULE_PATH, PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
 * STAGE1_E2E_API_PORT, STAGE1_E2E_FRONTEND_PORT, STAGE1_E2E_ARTIFACT_DIR.
 */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { configureTestEnvironment } = require('./test-environment.cjs');
const { sanitizeFailureMessage, serviceDiagnostics } = require('./e2e-diagnostics.cjs');

const backendDirectory = path.resolve(__dirname, '..');
const frontendDirectory = path.resolve(backendDirectory, '../frontend');
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function portFromEnvironment(name, fallback) {
  const port = Number(process.env[name] || fallback);
  assert(Number.isInteger(port) && port >= 1024 && port <= 65535, `${name} must be a valid unprivileged port`);
  return port;
}

async function assertPortAvailable(port) {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', () => reject(new Error(`Port ${port} is already occupied; choose a different E2E port`)));
    probe.listen(port, '127.0.0.1', resolve);
  });
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
}

function loadPlaywright() {
  if (process.env.PLAYWRIGHT_MODULE_PATH) return require(process.env.PLAYWRIGHT_MODULE_PATH);
  try { return require('playwright'); } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    const bundled = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
    if (fs.existsSync(bundled)) return require(bundled);
    throw new Error('Playwright is unavailable. Set PLAYWRIGHT_MODULE_PATH to an installed Playwright package; install its Chromium browser separately.');
  }
}

function startService(label, entry, arguments_, cwd, environment) {
  const child = spawn(process.execPath, [entry, ...arguments_], {
    cwd, env: environment, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  const service = { label, child, output: '', spawnError: null, ready: false };
  const capture = (buffer) => { service.output = (service.output + buffer.toString()).slice(-8000); };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  child.on('error', (error) => { service.spawnError = error; });
  return service;
}

async function waitForService(service, url) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (service.spawnError || service.child.exitCode !== null) throw new Error(`${service.label} failed to start`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (response.ok) { service.ready = true; return; }
    } catch { /* startup may still be in progress */ }
    await pause(200);
  }
  throw new Error(`${service.label} did not become ready within 45 seconds`);
}

async function stopService(service) {
  if (!service || service.child.exitCode !== null || service.child.signalCode !== null) return;
  service.child.kill();
  await Promise.race([
    new Promise((resolve) => service.child.once('exit', resolve)),
    pause(3000),
  ]);
  if (service.child.exitCode === null && service.child.signalCode === null) service.child.kill('SIGKILL');
}

// Construct the canonical signature independently of the production adapter.
function signedIpn(parameters, secret) {
  const canonical = Object.keys(parameters).sort()
    .filter((key) => parameters[key] !== '')
    .map((key) => `${key}=${encodeURIComponent(parameters[key]).replace(/%20/g, '+')}`).join('&');
  const signature = crypto.createHmac('sha512', secret).update(canonical, 'utf8').digest('hex');
  return `${canonical}&vnp_SecureHash=${signature}`;
}

async function apiRequest(context, baseUrl, route, { token, method = 'GET', data } = {}) {
  const response = await context.request.fetch(`${baseUrl}/api/v1${route}`, {
    method, data, headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const result = await response.json();
  assert(response.ok() && result.success, `${method} ${route.split('?')[0]} returned ${response.status()} (${result.error?.code || 'no error code'})`);
  return result.data;
}

async function register(context, baseUrl, suffix) {
  const identity = crypto.randomUUID();
  return apiRequest(context, baseUrl, '/auth/register', { method: 'POST', data: {
    email: `stage1.${suffix}.${identity}@example.test`,
    phone: `0${String(crypto.randomInt(1e9)).padStart(9, '0')}`,
    fullName: `Stage One ${suffix}`,
    birthDate: '1990-01-01',
    password: `${crypto.randomBytes(15).toString('hex')}A1`,
  } });
}

async function openShowtime(page, frontendUrl, movie, showtime, date) {
  await page.goto(frontendUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!localStorage.getItem('cinex_token'));
  // Use the public search UI so pagination cannot silently choose another movie.
  await page.getByRole('searchbox', { name: 'Tên phim' }).fill(movie.title);
  await page.getByRole('button', { name: 'Tìm phim', exact: true }).click();
  await page.getByRole('button', { name: `Chọn phim ${movie.title}`, exact: true }).click();
  await page.getByLabel('Rạp chiếu', { exact: true }).selectOption(showtime.cinemaId);
  const dateLabel = `${date.slice(8, 10)}/${date.slice(5, 7)}`;
  const dayButton = page.getByRole('group', { name: 'Ngày chiếu' }).getByRole('button').filter({ hasText: dateLabel });
  await dayButton.click();
  const timeLabel = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(showtime.startTime));
  const selected = page.getByRole('region', { name: 'Suất chiếu' }).getByRole('button')
    .filter({ hasText: timeLabel }).filter({ hasText: showtime.roomName }).filter({ hasText: showtime.format });
  assert.equal(await selected.count(), 1, 'The selected cinema, Vietnam date and room must resolve to one exact showtime');
  const seatsResponse = page.waitForResponse((response) => response.url().endsWith(`/showtimes/${showtime.id}/seats`) && response.ok());
  await selected.click();
  const map = (await (await seatsResponse).json()).data;
  assert.equal(map.showtime.id, showtime.id, 'Discovery must open the exact chosen showtime');
  await page.getByRole('button', { name: 'Đóng sơ đồ ghế' }).waitFor({ state: 'visible' });
  return map;
}

function seatButton(page, seat) {
  return page.getByRole('button', { name: `Ghế ${seat.rowLabel}${seat.seatNumber} loại ${seat.seatType}`, exact: true });
}

async function successfulMutation(page, method, route, action) {
  // Read the body as soon as it arrives: payment immediately navigates away,
  // and Chromium discards response bodies after that navigation.
  const responsePromise = page.waitForResponse((response) => response.request().method() === method && new URL(response.url()).pathname === route)
    .then(async (response) => {
      const body = await response.json();
      assert(response.ok() && body.success, `${method} ${route} failed in the browser`);
      return body.data;
    });
  await action();
  return responsePromise;
}

async function eventually(assertion, timeout = 12000) {
  const deadline = Date.now() + timeout;
  let lastError;
  do {
    try { await assertion(); return; } catch (error) { lastError = error; }
    await pause(100);
  } while (Date.now() < deadline);
  throw lastError;
}

async function main() {
  const { database } = configureTestEnvironment(); // validates target before any server/API write
  const apiPort = portFromEnvironment('STAGE1_E2E_API_PORT', 3101);
  const frontendPort = portFromEnvironment('STAGE1_E2E_FRONTEND_PORT', 5176);
  assert.notEqual(apiPort, frontendPort, 'Backend and frontend must use separate ports');
  await Promise.all([assertPortAvailable(apiPort), assertPortAvailable(frontendPort)]);
  const backendUrl = `http://127.0.0.1:${apiPort}`;
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  const artifactDirectory = path.resolve(process.env.STAGE1_E2E_ARTIFACT_DIR || path.join(os.tmpdir(), 'cinex-stage1-e2e'));
  fs.mkdirSync(artifactDirectory, { recursive: true });
  fs.writeFileSync(path.join(artifactDirectory, 'report.json'), `${JSON.stringify({ status: 'RUNNING', database }, null, 2)}\n`);
  const hashSecret = crypto.randomBytes(32).toString('hex');
  const environment = { ...process.env, PORT: String(apiPort), CORS_ALLOWED_ORIGINS: frontendUrl,
    REFRESH_COOKIE_SECURE: 'false', VNPAY_TMN_CODE: 'CINEX_E2E_TEST', VNPAY_HASH_SECRET: hashSecret,
    // A local navigation target avoids contacting the provider or moving money.
    // Payment creation and IPN verification still use the real production services.
    VNPAY_PAYMENT_URL: `${backendUrl}/health`, VNPAY_RETURN_URL: `${backendUrl}/api/v1/payment/vnpay/return`,
    FRONTEND_PAYMENT_RESULT_URL: `${frontendUrl}/payment/result`,
  };
  const services = [];
  let browser;
  let page;
  let phase = 'service-startup';
  try {
    services.push(startService('Backend', require.resolve('tsx/cli'), ['src/server.ts'], backendDirectory, environment));
    const viteEntry = path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js');
    services.push(startService('Frontend', viteEntry, ['--host', '127.0.0.1', '--port', String(frontendPort), '--strictPort'], frontendDirectory, {
      ...environment, NODE_ENV: 'development', VITE_API_BASE_URL: `${backendUrl}/api/v1`, VITE_ENABLE_MOCK_PAYMENT: 'false',
    }));
    await Promise.all([waitForService(services[0], `${backendUrl}/health`), waitForService(services[1], frontendUrl)]);
    phase = 'browser-launch';
    const { chromium } = loadPlaywright();
    browser = await chromium.launch({ headless: true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
    });
    phase = 'account-setup';
    const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const observerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const owner = await register(ownerContext, backendUrl, 'Owner');
    const observer = await register(observerContext, backendUrl, 'Observer');
    phase = 'discovery-setup';
    const [movies, cinemas, showtimes] = await Promise.all([
      apiRequest(ownerContext, backendUrl, '/movies?status=NOW_SHOWING&limit=100'),
      apiRequest(ownerContext, backendUrl, '/cinemas'),
      apiRequest(ownerContext, backendUrl, '/showtimes'),
    ]);
    const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
    const lastDay = new Date(Date.parse(`${today}T00:00:00Z`) + 6 * 86400000).toISOString().slice(0, 10);
    const candidates = showtimes.filter((showtime) => {
      const date = new Date(Date.parse(showtime.startTime) + 7 * 3600000).toISOString().slice(0, 10);
      return date >= today && date <= lastDay && Date.parse(showtime.startTime) > Date.now() + 30 * 60000
        && movies.some((movie) => movie.id === showtime.movieId) && cinemas.some((cinema) => cinema.id === showtime.cinemaId);
    });
    let chosen;
    for (const showtime of candidates) {
      const map = await apiRequest(ownerContext, backendUrl, `/showtimes/${showtime.id}/seats`);
      const available = map.seats.filter((seat) => seat.status === 'AVAILABLE' && seat.seatType !== 'BLOCKED');
      if (available.length >= 2) { chosen = { showtime, available }; break; }
    }
    assert(chosen, 'No bookable seeded showtime with two available seats exists. Prepare _test with the guarded test runner first.');
    const { showtime, available } = chosen;
    const movie = movies.find((candidate) => candidate.id === showtime.movieId);
    const date = new Date(Date.parse(showtime.startTime) + 7 * 3600000).toISOString().slice(0, 10);
    const [firstSeat, secondSeat] = available;
    page = await ownerContext.newPage();
    const observerPage = await observerContext.newPage();
    const pageErrors = [];
    const failedApiResponses = [];
    let holdCreations = 0;
    for (const currentPage of [page, observerPage]) {
      currentPage.setDefaultTimeout(20000);
      currentPage.on('pageerror', (error) => pageErrors.push(error.message));
      currentPage.on('response', (response) => {
        const url = new URL(response.url());
        if (url.origin === backendUrl && url.pathname.startsWith('/api/v1/') && response.status() >= 400) {
          failedApiResponses.push(`${response.status()} ${url.pathname}`);
        }
      });
    }
    page.on('request', (request) => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/orders') holdCreations++;
    });
    phase = 'booking';
    await openShowtime(page, frontendUrl, movie, showtime, date);
    await openShowtime(observerPage, frontendUrl, movie, showtime, date);
    assert.equal(await seatButton(observerPage, firstSeat).isEnabled(), true, 'Observer initially sees an available seat');
    if (/^T(13|16|18)$/.test(movie.ageRating)) await page.getByRole('checkbox', { name: /Tôi xác nhận đã đủ/ }).check();
    const held = await successfulMutation(page, 'POST', '/api/v1/orders', () => seatButton(page, firstSeat).click());
    assert.equal(held.showtimeId, showtime.id);
    assert.equal(held.status, 'PENDING_PAYMENT');
    assert.deepEqual(held.items.map((item) => item.seatId), [firstSeat.seatId]);
    const pending = await apiRequest(ownerContext, backendUrl, `/orders/pending?showtimeId=${showtime.id}`, { token: owner.accessToken });
    assert.equal(pending.id, held.id, 'Selecting the first seat immediately persists the pending hold');
    await eventually(async () => assert.equal(await seatButton(page, firstSeat).getAttribute('aria-pressed'), 'true'));
    await eventually(async () => assert.equal(await seatButton(observerPage, firstSeat).isDisabled(), true));
    const ownerMap = await apiRequest(ownerContext, backendUrl, `/showtimes/${showtime.id}/seats`, { token: owner.accessToken });
    const observerMap = await apiRequest(observerContext, backendUrl, `/showtimes/${showtime.id}/seats`, { token: observer.accessToken });
    const publicMap = await apiRequest(observerContext, backendUrl, `/showtimes/${showtime.id}/seats`);
    assert.equal(ownerMap.seats.find((seat) => seat.id === firstSeat.id).heldByCurrentUser, true);
    for (const map of [observerMap, publicMap]) {
      const masked = map.seats.find((seat) => seat.id === firstSeat.id);
      assert.equal(masked.status, 'HELD');
      assert.equal(masked.heldByCurrentUser, false);
      for (const secretField of ['userId', 'orderId', 'heldByOrderId', 'owner']) assert.equal(secretField in masked, false, `${secretField} must not leak in inventory`);
    }
    console.log('PASS Discovery exact movie/cinema/Vietnam date/showtime; immediate hold and observer polling/privacy');

    const expanded = await successfulMutation(page, 'PATCH', `/api/v1/orders/${held.id}`, () => seatButton(page, secondSeat).click());
    assert.equal(expanded.id, held.id);
    assert.equal(expanded.expiresAt, held.expiresAt, 'Adding a seat cannot extend the deadline');
    assert.equal(expanded.items.length, 2);
    await eventually(async () => assert.equal(await seatButton(page, secondSeat).getAttribute('aria-pressed'), 'true'));
    const reduced = await successfulMutation(page, 'PATCH', `/api/v1/orders/${held.id}`, () => seatButton(page, secondSeat).click());
    assert.equal(reduced.id, held.id);
    assert.equal(reduced.expiresAt, held.expiresAt);
    assert.deepEqual(reduced.items.map((item) => item.seatId), [firstSeat.seatId]);
    const releasedMap = await apiRequest(ownerContext, backendUrl, `/showtimes/${showtime.id}/seats`, { token: owner.accessToken });
    assert.equal(releasedMap.seats.find((seat) => seat.id === secondSeat.id).status, 'AVAILABLE');
    await page.getByRole('button', { name: 'TIẾP TỤC ĐẶT VÉ', exact: true }).click();
    await page.getByRole('heading', { name: 'Thanh toán vé xem phim', exact: true }).waitFor({ state: 'visible' });
    assert.equal(holdCreations, 1, 'Checkout must reuse the existing held order');
    phase = 'payment-initiation';
    const payResponsePromise = page.waitForResponse((response) => response.request().method() === 'POST'
      && new URL(response.url()).pathname === `/api/v1/orders/${held.id}/pay`);
    await page.getByRole('button', { name: 'THANH TOÁN NGAY', exact: true }).click();
    assert.equal((await payResponsePromise).status(), 200, 'Browser checkout must successfully initiate payment');
    await page.waitForURL((url) => url.origin === backendUrl && url.pathname === '/health');
    // Chromium can discard the fetch body on navigation. Verify the persisted
    // transaction through the real authenticated API and actual redirect URL.
    const paymentOrder = await apiRequest(ownerContext, backendUrl, `/orders/${held.id}`, { token: owner.accessToken });
    const redirectedTxnRef = new URL(page.url()).searchParams.get('vnp_TxnRef');
    const savedPayment = paymentOrder.payments.find((candidate) => candidate.txnRef === redirectedTxnRef);
    assert(savedPayment, 'Gateway navigation must correspond to a persisted Payment of this held order');
    assert.equal(paymentOrder.payments.length, 1);
    const payment = { orderId: paymentOrder.id, payment: savedPayment, expiresAt: paymentOrder.expiresAt };
    assert.equal(payment.orderId, held.id);
    assert.equal(payment.payment.amount, reduced.total);
    assert.equal(payment.expiresAt, held.expiresAt);
    assert.equal(holdCreations, 1, 'Paying must not create a second order');
    assert.equal(new URL(page.url()).searchParams.get('vnp_TxnRef'), payment.payment.txnRef);
    console.log('PASS Add/remove seats keeps order and deadline; checkout initiates real VNPay Payment on the same hold');

    phase = 'payment-result';
    const ipn = signedIpn({ vnp_TxnRef: payment.payment.txnRef, vnp_Amount: String(payment.payment.amount * 100),
      vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: `E2E${Date.now()}`,
    }, hashSecret);
    // A valid browser return with gateway success is still read-only before IPN.
    await page.goto(`${backendUrl}/api/v1/payment/vnpay/return?${ipn}`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL((url) => url.origin === frontendUrl && url.pathname === '/payment/result');
    assert.equal(new URL(page.url()).searchParams.get('orderId'), held.id, 'The actual return endpoint must redirect to the correct order');
    await page.getByRole('heading', { name: 'Đang xác nhận thanh toán', exact: true }).waitFor({ state: 'visible' });
    assert.equal(await page.locator('svg[width="96"][height="96"]').count(), 0, 'A signed browser return cannot settle payment or issue tickets');
    await page.goto(`${frontendUrl}/payment/result?orderId=${held.id}&status=FAILED&amount=1&vnp_ResponseCode=24`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Đang xác nhận thanh toán', exact: true }).waitFor({ state: 'visible' });
    assert.equal(await page.getByRole('heading', { name: 'Thanh toán thành công', exact: true }).count(), 0);
    assert.equal(await page.locator('svg[width="96"][height="96"]').count(), 0, 'No QR may appear before IPN');
    const beforeIpn = await apiRequest(ownerContext, backendUrl, `/orders/${held.id}`, { token: owner.accessToken });
    assert.equal(beforeIpn.status, 'PENDING_PAYMENT');
    assert(beforeIpn.items.every((item) => item.ticket === null));
    await page.goto(`${frontendUrl}/payment/result?orderId=${held.id}&status=PAID&code=FORGED_TICKET&amount=1&vnp_ResponseCode=00`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Đang xác nhận thanh toán', exact: true }).waitFor({ state: 'visible' });
    assert.equal(await page.getByText('FORGED_TICKET', { exact: true }).count(), 0, 'A forged browser query cannot supply a ticket code');
    assert.equal(await page.locator('svg[width="96"][height="96"]').count(), 0, 'A forged PAID query cannot issue a QR');
    const ipnResponse = await ownerContext.request.get(`${backendUrl}/api/v1/payment/vnpay/ipn?${ipn}`);
    assert.equal(ipnResponse.status(), 200);
    assert.equal((await ipnResponse.json()).RspCode, '00');
    await page.getByRole('heading', { name: 'Thanh toán thành công', exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('heading', { name: 'Vé điện tử CineX Pass', exact: true }).waitFor({ state: 'visible' });
    const paid = await apiRequest(ownerContext, backendUrl, `/orders/${held.id}`, { token: owner.accessToken });
    assert.equal(paid.status, 'PAID');
    assert.equal(paid.items.length, 1);
    assert(paid.items.every((item) => item.ticket?.status === 'VALID' && item.ticket.ticketCode));
    for (const item of paid.items) await page.getByText(item.ticket.ticketCode, { exact: true }).waitFor({ state: 'visible' });
    assert.equal(await page.locator('svg[width="96"][height="96"]').count(), paid.items.length);
    const duplicate = await ownerContext.request.get(`${backendUrl}/api/v1/payment/vnpay/ipn?${ipn}`);
    assert.equal((await duplicate.json()).RspCode, '02');
    const afterDuplicate = await apiRequest(ownerContext, backendUrl, `/orders/${held.id}`, { token: owner.accessToken });
    assert.deepEqual(afterDuplicate.items.map((item) => item.ticket), paid.items.map((item) => item.ticket), 'Duplicate IPN must not issue extra or different tickets');
    await eventually(async () => {
      const storage = await page.evaluate(() => localStorage.getItem('cinex_pending_order_id'));
      assert.equal(storage, null, 'A proven paid order clears the recovery hint');
    });
    assert.deepEqual(pageErrors, [], 'No browser runtime errors are allowed');
    assert.deepEqual(failedApiResponses, [], 'No unexpected API failures are allowed');
    const screenshot = path.join(artifactDirectory, 'payment-result.png');
    await page.screenshot({ path: screenshot, fullPage: true });
    const report = { status: 'PASS', database, checkedAt: new Date().toISOString(),
      scenarios: ['exact Discovery selection', 'immediate hold', '5 second observer inventory polling', 'owner privacy',
        'add/remove seats with fixed deadline', 'checkout hold reuse', 'real VNPay initiation', 'signed browser return redirects without settlement', 'untrusted return query ignored',
        'IPN-driven result polling', 'issued ticket code and QR', 'duplicate IPN idempotence'], screenshot,
    };
    fs.writeFileSync(path.join(artifactDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`PASS Server-authoritative PENDING → PAID/issued QR, forged URL ignored, duplicate IPN unchanged (${database})`);
    console.log(`Artifacts: ${artifactDirectory}`);
  } catch (error) {
    const message = sanitizeFailureMessage(error.message, environment);
    const diagnostics = path.join(artifactDirectory, 'service-diagnostics.json');
    fs.writeFileSync(diagnostics, `${JSON.stringify({ phase, services: services.map(serviceDiagnostics) }, null, 2)}\n`);
    if (page && !page.isClosed()) {
      await page.screenshot({ path: path.join(artifactDirectory, 'failure.png'), fullPage: true }).catch(() => {});
    }
    fs.writeFileSync(path.join(artifactDirectory, 'report.json'), `${JSON.stringify({ status: 'FAIL', database, phase, error: message, diagnostics }, null, 2)}\n`);
    throw new Error(message);
  } finally {
    try { if (browser) await browser.close(); }
    finally { await Promise.all(services.map(stopService)); }
  }
}

main().catch((error) => {
  // Do not print API bodies, credentials, cookies, signed callbacks or server env.
  console.error(`Stage 1 browser E2E failed: ${sanitizeFailureMessage(error.message, process.env)}`);
  process.exitCode = 1;
});
