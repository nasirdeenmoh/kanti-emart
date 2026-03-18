const btn = document.getElementById('hamburger');
const nav = document.getElementById('navLinks');

btn.addEventListener('click', () => {
    btn.classList.toggle('open');
    nav.classList.toggle('open');
});

// close on link click
nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        btn.classList.remove('open');
        nav.classList.remove('open');
    });
});