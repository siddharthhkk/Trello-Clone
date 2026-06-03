// Shared frontend helpers — used by all HTML pages to talk to Week10.js (Express on port 3000)

const API_BASE = window.location.origin // same host as server when served via express.static

// JWT from signin — stored in browser so other pages stay logged in
function getToken() {
    return localStorage.getItem('token') || ''
}

function setToken(token) {
    localStorage.setItem('token', token) // called after POST /signin in signin.html
}

function clearToken() {
    localStorage.removeItem('token')
}

// Redirect to signin if no token — used on protected pages (orgs, org, board, admin-members)
function requireAuth(redirectTo = 'signin.html') {
    if (!getToken()) {
        window.location.href = redirectTo
        return false
    }
    return true
}

// Read ?orgId=1 or ?boardId=2 from URL
function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name)
}

// Same as getQueryParam but redirects if missing (e.g. org.html needs orgId)
function requireQueryParam(name, redirectTo = 'orgs.html') {
    const value = getQueryParam(name)
    if (!value) {
        window.location.href = redirectTo
        return null
    }
    return value
}

// Wrapper around fetch — auto-adds token header for Week10MiddleWare.js auth
async function apiFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) }
    if (options.auth !== false) {
        headers.token = getToken() // backend reads req.headers.token
    }
    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
    }
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
    const data = await response.json().catch(() => ({}))
    // expired/invalid token → kick back to signin
    if (response.status === 403 && options.auth !== false) {
        clearToken()
        window.location.href = 'signin.html'
        return { response, data }
    }
    return { response, data }
}

// Show green/red feedback in a <p id="message"> on the page
function showMessage(elementId, text, isError = false) {
    const el = document.getElementById(elementId)
    if (el) {
        el.innerText = text
        el.className = isError ? 'message error' : 'message success'
    }
}

function logout() {
    clearToken()
    window.location.href = 'signin.html'
}

