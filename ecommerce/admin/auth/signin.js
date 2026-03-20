import { supabase } from "../scripts/utils/config.js"
const emailEl    = document.getElementById('email')
const passwordEl = document.getElementById('password')
const signinBtn  = document.getElementById('signinBtn')
const togglePw   = document.getElementById('togglePw')
const errorAlert = document.getElementById('errorAlert')
const errorMsg   = document.getElementById('errorMsg')
const loadingOverlay = document.getElementById('loadingOverlay')

// Password toggle
togglePw.addEventListener('click', () => {
    const isHidden = passwordEl.type === 'password'
    passwordEl.type = isHidden ? 'text' : 'password'
    togglePw.querySelector('svg').innerHTML = isHidden
    ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>`
    : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`
})

// Ripple effect
signinBtn.addEventListener('click', function(e) {
    const rect = this.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top  - size / 2
    const ripple = document.createElement('span')
    ripple.className = 'ripple'
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`
    this.appendChild(ripple)
    setTimeout(() => ripple.remove(), 600)
    handleSignIn()
})

// Enter key
document.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSignIn()
})

function showError(msg) {
    errorMsg.textContent = msg
    errorAlert.classList.add('show')
}
function hideError() {
    errorAlert.classList.remove('show')
}

async function handleSignIn() {
    hideError()
    const email    = emailEl.value.trim()
    const password = passwordEl.value

    if (!email) return showError('Please enter your email address.')
    if (!password) return showError('Please enter your password.')

    loadingOverlay.classList.add('show')

    // TODO: Replace with your actual auth call
    const {data, error} = await supabase.auth.signInWithPassword({email: email, password: password})
    if(error){
        showError('Invalid email or password.')
        loadingOverlay.classList.remove('show')
        return
    }

    window.location.href = '../'
}