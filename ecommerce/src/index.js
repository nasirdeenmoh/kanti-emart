import { getAllProducts, getProductsByCategory, fetchCategories, saveOrder, updateProductStock, searchProducts } from './services/productService.js';
import { getCurrentUser, signOut } from './services/authService.js';
import { supabase } from './services/supabaseClient.js';
import { handleCheckout, initializePaystack } from './services/paymentService.js';

export function updateCartBadge() {
    const cartStr = localStorage.getItem('kanti_cart');
    const cart = cartStr ? JSON.parse(cartStr) : [];
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cartBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

// --- Global State ---
let cart = JSON.parse(localStorage.getItem('kanti_cart')) || [];

// --- Initialization ---
async function init() {
    // 1. Persistence check
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        updateSidebarProfile(session.user);
    } else {
        resetSidebarProfile();
    }

    // 2. Auth Listener
    supabase.auth.onAuthStateChange((event, currentSession) => {
        if (event === 'SIGNED_IN' && currentSession) {
            updateSidebarProfile(currentSession.user);
        } else if (event === 'SIGNED_OUT') {
            resetSidebarProfile();
        }
    });

    // Cross-tab synchronization
    window.addEventListener('storage', (e) => {
        if (e.key === 'kanti_cart') {
            cart = JSON.parse(e.newValue) || [];
            renderCart();
            updateCartBadge();
        }
    });

    // 1. Load Categories
    await loadCategories();

    // 2. Load Products
    await loadProducts();

    // Auto-update badge on load
    updateCartBadge();
    // 4. Enhanced Search Listener with Dropdown
    const searchInput = document.getElementById('searchInput');
    const searchDropdown = document.getElementById('searchDropdown');

    if (searchInput && searchDropdown) {
        searchInput.addEventListener('input', debounce(async (e) => {
            const query = e.target.value.trim();
            const grid = document.getElementById('productGrid');

            // Handle Empty Query
            if (query === '' || query.length < 2) {
                searchDropdown.style.display = 'none';
                if (grid && query === '') {
                    grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--muted);">Loading products...</p>';
                    // Get currently active category
                    const activeLi = document.querySelector('.category-list li.active');
                    const catId = activeLi ? activeLi.dataset.categoryId : null;
                    const products = await getProductsByCategory(catId || null);
                    renderProducts(products, grid);
                }
                return;
            }

            // 1. Dropdown Logic
            const { data, error } = await supabase
                .from('products')
                .select('id, name, price, image_url')
                .ilike('name', `%${query}%`)
                .limit(3);

            if (!error && data && data.length > 0) {
                searchDropdown.innerHTML = data.map(item => `
                    <div class="search-dropdown-item" onclick="window.location.href='#productGrid'; document.getElementById('searchInput').value='${item.name}'; searchDropdown.style.display='none';">
                        <div style="display: flex; align-items: center;">
                            <img src="${item.image_url}" class="search-dropdown-img" onerror="this.src='../assets/placeholder.jpg'">
                            <span style="font-size: 0.9rem; font-weight: 500; color: var(--ink);">${item.name}</span>
                        </div>
                        <span style="font-size: 0.9rem; font-weight: 600; color: var(--green);">₦${item.price.toLocaleString('en-NG')}</span>
                    </div>
                `).join('');
                searchDropdown.style.display = 'block';
            } else {
                searchDropdown.innerHTML = `<div style="padding: 12px 16px; color: var(--muted); font-size: 0.9rem;">No matches found for "${query}"</div>`;
                searchDropdown.style.display = 'block';
            }

            // 2. Main Grid Visual Logic
            if (grid) {
                grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--muted);">Searching...</p>';
                try {
                    const products = await searchProducts(query);
                    if (products.length === 0) {
                        grid.innerHTML = `<p style="grid-column: 1 / -1; text-align: center;">No products found for "${query}"</p>`;
                    } else {
                        document.querySelectorAll('.category-list li').forEach(el => el.classList.remove('active'));
                        renderProducts(products, grid);
                    }
                } catch (err) {
                    grid.innerHTML = '<p style="grid-column: 1 / -1; color: var(--red);">Error searching products.</p>';
                }
            }
        }, 200));

        // Hide dropdown clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.style.display = 'none';
            }
        });

        // Show dropdown on re-focus
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length >= 2 && searchDropdown.innerHTML !== '') {
                searchDropdown.style.display = 'block';
            }
        });

        // Search clear button logic
        const clearBtn = document.getElementById('clearSearchBtn');
        if (clearBtn) {
            searchInput.addEventListener('input', (e) => {
                clearBtn.style.display = e.target.value.length > 0 ? 'block' : 'none';
            });
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearBtn.style.display = 'none';
                searchInput.dispatchEvent(new Event('input'));
            });
        }
    }

    loadCategories();
    renderCart();
    await loadProducts();

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout);

    // 5. Delivery Modal Flow
    const deliveryModal = document.getElementById('deliveryModal');
    const closeDeliveryModal = document.getElementById('closeDeliveryModal');
    const deliveryForm = document.getElementById('deliveryForm');

    if (closeDeliveryModal) {
        closeDeliveryModal.addEventListener('click', () => {
            deliveryModal.style.display = 'none';
        });
    }

    if (deliveryForm) {
        deliveryForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Extract details from form
            const address = document.getElementById('streetAddress').value.trim();
            const area = document.getElementById('areaLandmark').value.trim();
            const phone = document.getElementById('phoneNumber').value.trim();
            const instructions = document.getElementById('deliveryInstructions').value.trim();

            // Generate unified payload securely
            const shippingDetails = {
                street_address: address,
                area_landmark: area,
                phone: phone,
                instructions: instructions
            };

            // Switch to loading state visually
            const paystackSpinner = document.getElementById('paystackSpinner');
            const paystackBtnText = document.getElementById('paystackBtnText');
            if (paystackSpinner) paystackSpinner.style.display = 'inline-block';
            if (paystackBtnText) paystackBtnText.textContent = 'Processing...';

            // Proceed bridging over logic
            initializePaystack(cart, shippingDetails);
        });
    }

    // 6. Cart Drawer Toggle Logic
    const cartContainer = document.querySelector('.cart-container');
    const cartDrawer = document.getElementById('cartDrawer');
    const cartOverlay = document.getElementById('cartOverlay');
    const closeCartDrawer = document.getElementById('closeCartDrawer');

    function toggleCart() {
        if (cartDrawer && cartOverlay) {
            cartDrawer.classList.toggle('open');
            cartOverlay.classList.toggle('open');
        }
    }

    if (cartContainer) cartContainer.addEventListener('click', toggleCart);
    if (closeCartDrawer) closeCartDrawer.addEventListener('click', toggleCart);
    if (cartOverlay) cartOverlay.addEventListener('click', toggleCart);

    // 7. Sidebar Drawer Toggle Logic
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('mainSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');

    function toggleSidebar() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('open');
        }
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);
}

// --- Sidebar Profile Updates ---
async function updateSidebarProfile(user) {
    const profileEl = document.getElementById('sidebarProfile');
    if (!profileEl) return;

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', user.id)
            .single();

        let name = "Customer";
        let avatarContent = `<i class="fa-solid fa-user"></i>`;

        if (data) {
            if (data.full_name) name = data.full_name;
            if (data.avatar_url) {
                avatarContent = `<img src="${data.avatar_url}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else {
                const initial = name.charAt(0).toUpperCase();
                avatarContent = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: var(--green); color: white; border-radius: 50%; font-weight: 600; font-size: 1.2rem;">${initial}</div>`;
            }
        } else {
            const initial = name.charAt(0).toUpperCase();
            avatarContent = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: var(--green); color: white; border-radius: 50%; font-weight: 600; font-size: 1.2rem;">${initial}</div>`;
        }

        profileEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div class="avatar" style="width: 48px; height: 48px; border-radius: 50%; overflow: hidden; border: 2px solid var(--cream); flex-shrink: 0;">
                    ${avatarContent}
                </div>
                <div style="display: flex; flex-direction: column; overflow: hidden;">
                    <span style="font-weight: 600; font-size: 0.95rem; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</span>
                    <span style="font-size: 0.75rem; color: var(--green); font-weight: 500;">Verified Member</span>
                </div>
            </div>
            <button class="sign-out-btn" id="signOutBtn" style="width: 100%; padding: 10px; border-radius: 8px; font-weight: 600;">Sign Out</button>
        `;
        document.getElementById('signOutBtn').addEventListener('click', handleSignOut);
    } catch (err) {
        console.error("Error updating sidebar profile:", err);
    }
}

function resetSidebarProfile() {
    const profileEl = document.getElementById('sidebarProfile');
    if (!profileEl) return;

    profileEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div class="avatar" style="width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--border); color: var(--green); font-size: 1.2rem; flex-shrink: 0;">
                <i class="fa-solid fa-user"></i>
            </div>
            <span class="user-name" style="cursor: pointer; font-weight: 600; font-size: 0.95rem; color: var(--ink);" onclick="window.location.href='login.html'">Login / Sign Up</span>
        </div>
    `;
}

async function handleSignOut() {
    try {
        await signOut();
    } catch (err) {
        alert("Failed to sign out.");
    }
}

// --- Utils ---
function formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- Products ---
async function loadProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    try {
        const products = await getAllProducts();
        renderProducts(products, grid);
    } catch (err) {
        grid.innerHTML = '<p style="grid-column: 1 / -1; color: var(--red);">Error loading products.</p>';
    }
}

async function loadCategories() {
    const list = document.getElementById('categoryList');
    if (!list) return;

    try {
        const categories = await fetchCategories();
        list.innerHTML = `<li data-category-id="" class="active">All Categories</li>`;

        categories.forEach(cat => {
            const li = document.createElement('li');
            li.dataset.categoryId = cat.id;

            if (cat.icon_name) {
                li.innerHTML = `<i class="${cat.icon_name}"></i> <span>${cat.name}</span>`;
            } else {
                li.innerHTML = `<span>${cat.name}</span>`;
            }
            list.appendChild(li);
        });

        list.addEventListener('click', async (e) => {
            const li = e.target.closest('li');
            if (!li) return;

            list.querySelectorAll('li').forEach(el => el.classList.remove('active'));
            li.classList.add('active');

            const catId = li.dataset.categoryId;
            const grid = document.getElementById('productGrid');
            if (!grid) return;

            grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--muted);">Loading products...</p>';
            try {
                const products = await getProductsByCategory(catId || null);
                renderProducts(products, grid);
            } catch (err) {
                grid.innerHTML = '<p style="grid-column: 1 / -1; color: var(--red);">Error loading products.</p>';
            }
        });

    } catch (err) {
        list.innerHTML = '<li style="color: var(--red);">Error loading categories.</li>';
        console.error("Categories load failed:", err);
    }
}

function renderProducts(products, grid) {
    if (products && products.length > 0) {
        grid.innerHTML = '';
        products.forEach(product => {
            grid.appendChild(createProductCard(product));
        });
    } else {
        grid.innerHTML = '<p style="grid-column: 1 / -1;">No products found.</p>';
    }
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const imgUrl = product.image_url || 'https://via.placeholder.com/200?text=No+Image';

    // Safely extract joined category name
    const categoryName = (product.categories && product.categories.name) ? product.categories.name : '';

    card.innerHTML = `
        <img src="${imgUrl}" alt="${product.name}">
        <p style="font-size: 0.75rem; color: var(--green); margin-bottom: 2px; font-weight: bold;">${categoryName}</p>
        <h3 class="product-title">${product.name}</h3>
        <p class="product-weight">${product.weight_volume || 'N/A'}</p>
        <div class="product-footer">
            <span class="product-price">${formatCurrency(product.price)}</span>
            <button class="add-to-cart" aria-label="Add to cart" data-id="${product.id}">🛒</button>
        </div>
    `;

    // Add to cart event
    const btn = card.querySelector('.add-to-cart');
    btn.addEventListener('click', () => {
        window.addToCart(product.id, product.name, product.price);

        // Quick visual feedback
        const oldBg = btn.style.background;
        btn.style.background = 'var(--ink)';
        setTimeout(() => btn.style.background = oldBg, 200);
    });

    return card;
}

// --- Cart ---
window.addToCart = function addToCart(id, name, price) {
    const numId = Number(id);
    const existingItem = cart.find(item => Number(item.id) === numId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id: numId, name, price, quantity: 1 });
    }

    // Update local storage
    localStorage.setItem('kanti_cart', JSON.stringify(cart));
    console.log("Item added to cart:", { id: numId, name, price });
    console.table(cart);
    renderCart();

    // Visual feedback handled by Toast instead of drawer
    showToast(`Added ${name} to cart!`);
}

function showToast(message) {
    let toast = document.getElementById('cartToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'cartToast';
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%) translateY(100px)';
        toast.style.background = 'var(--ink)';
        toast.style.color = 'white';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '50px';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        toast.style.zIndex = '9999';
        toast.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        toast.style.fontWeight = '500';
        toast.style.fontSize = '0.95rem';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    
    // Slide up
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    // Hide after 2 seconds
    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(100px)';
    }, 2000);
}

window.removeFromCart = function removeFromCart(id) {
    const numId = Number(id);
    cart = cart.filter(item => Number(item.id) !== numId);
    localStorage.setItem('kanti_cart', JSON.stringify(cart));
    renderCart();
}

window.updateQuantity = function updateQuantity(id, change) {
    const numId = Number(id);
    const item = cart.find(i => Number(i.id) === numId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(i => Number(i.id) !== numId);
        }
        localStorage.setItem('kanti_cart', JSON.stringify(cart));
        renderCart();
    }
}

function renderCart() {
    cart = JSON.parse(localStorage.getItem('kanti_cart')) || [];
    const cartSummary = document.getElementById('cartSummary');
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (!cartSummary) return;

    if (cart.length === 0) {
        cartSummary.innerHTML = '<p class="muted" style="margin: 0;">Your cart is empty.</p>';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        return;
    }

    let total = 0;
    cartSummary.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
        <div style="display: flex; justify-content: space-between; margin-bottom: 16px; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
            <div style="flex-grow: 1; padding-right: 12px;">
                <h4 style="font-size: 0.95rem; margin-bottom: 6px; color: var(--ink); font-family: 'Jost', sans-serif; margin-top: 0;">${item.name}</h4>
                <div style="font-size: 0.85rem; color: var(--muted); display: flex; align-items: center; gap: 8px;">
                    <button onclick="window.updateQuantity('${item.id}', -1)" style="padding: 2px 8px; border: 1px solid var(--border); background: var(--cream); border-radius: 6px; cursor: pointer; color: var(--ink); transition: background 0.2s;" onmouseover="this.style.background='var(--border)'" onmouseout="this.style.background='var(--cream)'">-</button>
                    <span style="font-weight: 500; font-size: 0.9rem;">${item.quantity}</span>
                    <button onclick="window.updateQuantity('${item.id}', 1)" style="padding: 2px 8px; border: 1px solid var(--border); background: var(--cream); border-radius: 6px; cursor: pointer; color: var(--ink); transition: background 0.2s;" onmouseover="this.style.background='var(--border)'" onmouseout="this.style.background='var(--cream)'">+</button>
                </div>
            </div>
            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                <div style="font-weight: 600; color: var(--green); font-size: 1rem;">${formatCurrency(itemTotal)}</div>
                <button onclick="window.removeFromCart('${item.id}')" style="background: none; border: none; color: var(--red); font-size: 0.75rem; cursor: pointer; padding: 4px; border-radius: 4px;" onmouseover="this.style.background='rgba(255,0,0,0.1)'" onmouseout="this.style.background='none'">Remove</button>
            </div>
        </div>`;
    }).join('');

    cartSummary.innerHTML += `
        <div style="border-top: 1px solid var(--border); margin-top: 10px; padding-top: 10px; display: flex; justify-content: space-between; font-weight: bold; color: var(--ink);">
            <span>Total</span>
            <span>${formatCurrency(total)}</span>
        </div>
    `;

    if (checkoutBtn) {
        checkoutBtn.style.display = 'block';
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                checkoutBtn.disabled = true;
                checkoutBtn.style.opacity = '0.5';
                checkoutBtn.title = 'Please login to checkout';
            } else {
                checkoutBtn.disabled = false;
                checkoutBtn.style.opacity = '1';
                checkoutBtn.title = '';
            }
        });
    }

    // Update live nav-badge natively
    updateCartBadge();
}

document.addEventListener('DOMContentLoaded', init);
