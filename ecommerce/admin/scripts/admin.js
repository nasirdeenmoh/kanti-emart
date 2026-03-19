import {supabase} from '../scripts/utils/config.js'
import { authenticateUser } from './utils/authGuard.js'
import { startup } from './utils/startup.js'
import { admin } from './utils/components.js'
const navsNL = document.querySelectorAll('.nav')
const navArray = Array.from(navsNL)
const content = document.querySelector('.content')


await startup()
await authenticateUser()

async function updateProducts(){
    const categories = ['Electronics', 'Sports', 'Food', 'Health']
    const product_grid = document.querySelector('.products-grid')
    const products = await admin.getProducts()
    if(products.length == 0){
        document.querySelector('.grid-loading').innerHTML = 'No Products Found'
        return
    }
    product_grid.innerHTML = ""
        products.forEach(product => {
            const productImage = product.image_url ? `<img src="${product.image_url}">` : '<i class="hgi hgi-stroke hgi-package"></i>'
            const inStock = product.stock_count > 0 ? 'In Stock' : 'Out of Stock'
            const stockStatus = product.stock_count > 0 ? 'delivered' : 'cancelled'
            const template = `
            <div class="product-card">
            <div class="product-image">
                ${productImage}
            </div>
            <div class="product-body">
                <span class="product-category">${categories[Number(product.category_id)]}</span>
                <div class="product-title-row">
                    <span class="product-name">${product.name}</span>
                    <span class="status ${stockStatus}">${inStock}</span>
                </div>
                <div class="product-price-row">
                    <span class="product-price">${admin.formatCurrency(product.price)}</span>
                    <span class="product-stock">Stock: ${product.stock_count ? product.stock_count : 0} units</span>
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary product-edit" data-id="${product.id}" id='editBtn'><i class="hgi hgi-stroke hgi-pencil-edit-01"></i> Edit</button>
                    <button class="btn btn-danger" id='deleteBtn' data-id="${product.id}"><i class="hgi hgi-stroke hgi-delete-02"></i></button>
                </div>
            </div>
        </div>
            `
            product_grid.insertAdjacentHTML('beforeend', template)
        })
}

async function initPageScript(page){
    if(page == 'products'){
        const products_overlay = document.querySelector('.add-product-overlay')
        const newProd = document.querySelector('.newProduct')
        const openBtn = document.querySelector('#addProducts')
        const cancelBtnNL = document.querySelectorAll('.close')
        const cancelBtnArr = Array.from(cancelBtnNL)
        const productImageEl = document.querySelector('#productImage')
        const product_grid = document.querySelector('.products-grid')
        const editProductOverlay = document.querySelector('#editProductOverlay')
        const body = document.querySelector('body')
        const editProducts = document.querySelector('.editProduct')
        await updateProducts()
        const searchInput = document.querySelector('.products-toolbar .orders-search input')

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim()

            document.querySelectorAll('.product-card').forEach(card => {
                const name = card.querySelector('.product-name').textContent.toLowerCase()
                const category = card.querySelector('.product-category').textContent.toLowerCase()

                const matches = name.includes(query) || category.includes(query)
                card.style.display = matches ? '' : 'none'
            })
        })
        openBtn.addEventListener('click', () =>{
            products_overlay.classList.remove('hide')
            body.classList.add('no-scroll') 
        })
        product_grid.addEventListener('click', async (e) => {
            if(e.target.closest('#editBtn')){
                editProductOverlay.classList.remove('hide')
                const editBtn = e.target.closest('#editBtn')
                const productId = editBtn.dataset.id

                // Fetch product from Supabase
                const { data: product, error } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', productId)
                    .single()
                console.log(product)
                if (error) { console.error(error.message); return }

                // Populate the form
                document.getElementById('editProductId').value = product.id
                document.getElementById('editName').value = product .name
                document.getElementById('editCategory').value = product.category_id
                document.getElementById('editPrice').value = product.price
                document.getElementById('editStock').value = product.stock_count
                document.getElementById('editDescription').value = product.description ?? ''
                body.classList.add('no-scroll')

            }
            if(e.target.closest('#deleteBtn')){
                console.log('click')
                const deleteBtn = e.target.closest('#deleteBtn')

                const productId = deleteBtn.dataset.id
                const confirmed = confirm('Are you sure you want to delete this product?')
                if (!confirmed) return

                const { error } = await supabase
                    .from('products')
                    .delete()
                    .eq('id', productId)

                if (error) {
                    console.error('Delete failed:', error.message)
                    return
                }

                // Remove card from DOM instantly
                deleteBtn.closest('.product-card').remove()
            }
        })
        async function uploadProductImage(file) {
            const ext = file.name.split('.').pop()
            const fileName = `${Date.now()}.${ext}`

            const { data, error } = await supabase.storage
                .from('products')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (error) {
                console.error('Upload failed:', error.message)
                return null
            }

            // Get the public URL
            const { data: urlData } = supabase.storage
                .from('products')
                .getPublicUrl(fileName)

            return urlData.publicUrl
        }
        productImageEl.addEventListener('change', () => {
            const fileUploadArea = document.getElementById('fileUploadArea')
            const fileName = document.getElementById('fileName')
            const file = productImageEl.files[0]
             if (file) {
                fileName.textContent = file.name
                fileUploadArea.classList.add('has-file')
            } else {
                fileName.textContent = 'No file chosen'
                fileUploadArea.classList.remove('has-file')
            }
        })
        newProd.addEventListener('submit', async (e) => {
            e.preventDefault()
            const form = e.target
            const productImage = form.querySelector('#productImage').files[0]
            const productName = form.querySelector('.product-name').value
            const productCategory = form.querySelector('#categories').value
            const price = form.querySelector('.price').value
            const quantity = form.querySelector('.quantity').value
            const weight = form.querySelector('.weight').value || false
            const description = form.querySelector('.description').value || false
            console.log(productName, price, quantity, productCategory, productImage, weight, description, price)
            const submitBtn = form.querySelector('[type="submit"]')
            submitBtn.textContent = 'Uploading...'
            submitBtn.disabled = true

            const imageUrl = await uploadProductImage(productImage)

            if (!imageUrl) {
                submitBtn.textContent = 'Add Product'
                submitBtn.disabled = false
                alert('Image upload failed. Try again.')
                return
            }
            console.log(quantity)
            const { error } = await supabase.from('products').insert({
                name: productName.trim(),
                category_id: productCategory,
                price: parseFloat(price),
                stock_count: parseInt(quantity),
                description: description ? description.trim() : '',
                image_url: imageUrl,
                weight_volume: weight
            })

            if (error) {
                console.error(error.message)
                alert('Failed to save product.')
                submitBtn.textContent = 'Add Product'
                submitBtn.disabled = false
                return
            }
            updateProducts()
            // 3. Done
            products_overlay.classList.add('hide')
            form.reset()
            fileUploadArea.classList.remove('has-file')
            fileName.textContent = 'No file chosen'
            submitBtn.textContent = 'Add Product'
            submitBtn.disabled = false
            alert('Product added!')
        
        })
        
        cancelBtnArr.forEach(el => {
            el.addEventListener('click', () => {
                    products_overlay.classList.add('hide')
                    editProductOverlay.classList.add('hide')
                    body.classList.remove('no-scroll')
            })
        })
        
        editProducts.addEventListener('submit', async (e) => {
            e.preventDefault()
            const form = e.target

            const id = document.getElementById('editProductId').value
            const submitBtn = form.querySelector('[type="submit"]')

            submitBtn.textContent = 'Saving...'
            submitBtn.disabled = true

            const { error } = await supabase
                .from('products')
                .update({
                    name: document.getElementById('editName').value.trim(),
                    category_id: parseInt(document.getElementById('editCategory').value),
                    price: parseFloat(document.getElementById('editPrice').value),
                    stock_count: parseInt(document.getElementById('editStock').value),
                    description: document.getElementById('editDescription').value ? document.getElementById('editDescription').value : ''
                })
                .eq('id', id)

            if (error) {
                console.error('Update failed:', error.message)
                submitBtn.textContent = 'Save Changes'
                submitBtn.disabled = false
                return
            }

            // Refresh grid
            updateProducts()

            // Close overlay
            document.getElementById('editProductOverlay').classList.remove('active')
            document.body.classList.remove('no-scroll')

            submitBtn.textContent = 'Save Changes'
            submitBtn.disabled = false
        })
    }
    else if(page == 'orders'){
        const orders = await admin.getOrders()
        const orders_container = document.querySelector('.orders-container')
        if (orders.length == 0){
            document.querySelector('.table-loading').innerHTML = 'No orders processed yet'
            return
        }
        orders_container.innerHTML = ''
        orders.forEach(order => {
            const isPaid = order.status == 'paid' ? "delivered" : 'pending'
            const template = `
                <tr>
                    <td class="order-id">#${order.id}</td>
                    <td class='order-uid'>${order.user_id}</td>
                    <td>${new Date(order.created_at).toLocaleDateString()}</td>
                    <td>${order.items.length}</td>
                    <td class='order-amount'>${admin.formatCurrency(order.total_amount)}</td>
                    <td><span class="status ${isPaid}">${order.status}</span></td>
                </tr>
            `
            console.log(template)
            orders_container.insertAdjacentHTML('beforeend', template)
        })
        const searchInput = document.querySelector('.orders-search input')

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim()

            document.querySelectorAll('.orders-table tbody tr').forEach(row => {
                const orderId = row.querySelector('.order-id')?.textContent.toLowerCase()
                const userId = row.querySelector('.order-uid')?.textContent.toLowerCase()
                const amount = row.querySelector('.order-amount')?.textContent.toLowerCase()

                const matches = orderId?.includes(query) || 
                                userId?.includes(query) || 
                                amount?.includes(query)

                row.style.display = matches ? '' : 'none'
            })
        })
    }
    else if(page == 'customers'){
        const customerGrid = document.querySelector('.customers-grid')
        const roles = ['Admin', 'Manager', 'Staff']
        const users =  await admin.getUsers()
        if(users.length == 0){
            document.querySelector('.grid-loading').innerHTML = 'No Users Found.'
            return
        }
        customerGrid.innerHTML =""
        users.forEach(async (user) => {
            let totalOrder = 0
            let totalAmount = 0
            const userName = user.full_name
            const userInitials = userName.split(' ')
            if (user){
                const orders = await admin.getOrderFromUser(user.id)
                orders.forEach(order => {
                    totalOrder += order.items.length
                    totalAmount += parseInt(order.total_amount)
                })
            }
            let isBlocked = user.blocked ? 'Unblock' : 'Block'
            const template = `
            <div class="customer-card">
            <div class="customer-header">
                <span class="customer-avatar">${userInitials[0][0]}${userInitials[1][0]}</span>
                <div class="customer-info">
                    <span class="customer-name">${userName}</span>
                    <span class="customer-id">${user.id}</span>
                </div>
            </div>
            <div class="customer-stats">
                <div>
                    <p class="stat-label">Total Orders</p>
                    <p class="stat-value">${totalOrder}</p>
                </div>
                <div>
                    <p class="stat-label">Total Spent</p>
                    <p class="stat-value">${totalAmount}</p>
                </div>
            </div>
            <button class="btn btn-primary btn-full">${isBlocked}</button>
        </div>
            `
            customerGrid.insertAdjacentHTML('beforeend', template)
        })

        const searchInput = document.querySelector('.customers-toolbar .orders-search input')

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim()

            document.querySelectorAll('.customer-card').forEach(card => {
                const name = card.querySelector('.customer-name')?.textContent.toLowerCase()
                const id = card.querySelector('.customer-id')?.textContent.toLowerCase()

                const matches = name?.includes(query) || id?.includes(query)
                card.style.display = matches ? '' : 'none'
            })
        })
    }
    else if(page =='dashboard'){
        const revenueEl = document.querySelector('#revenue')
        const ordersEl = document.querySelector('#orders')
        const customersEl = document.querySelector('#customers')
        const orders = await admin.getOrders()
        const customers = await admin.getUsers()
        let totalRev = 0
        let totalOrder = 0
        let totalCustomers = 0

        orders.forEach(order => {
            totalRev += parseInt(order.total_amount)
            totalOrder += 1
        })
        customers.forEach(customer => {
            totalCustomers += 1
        })
        revenueEl.innerHTML = admin.formatCurrency(totalRev)
        ordersEl.innerHTML = totalOrder
        customersEl.innerHTML = totalCustomers

        async function recentOrder(){
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

            const { data: recentOrders } = await supabase
                .from('orders')
                .select('id, total_amount, user_id, status, created_at')
                .gte('created_at', oneHourAgo)
                .order('created_at', { ascending: false })
                return recentOrders
        }
        const recentOrders = await recentOrder()
        if(recentOrders.length == 0){
            document.querySelector('.orders-body').querySelector('.grid-loading').innerHTML = 'No recent orders found'
            return
        }
        document.querySelector('.orders-body').innerHTML = ''
        let orderNo = 1
        recentOrders.forEach(order => {
            const template = `<div class="item">
                    <div class="multiple">
                        <span class="order-id">#${orderNo}</span>
                        <span class="name sub-item">${order.user_id.slice(0, 4)}...</span>
                    </div>
                    <div class="multiple">
                        <span class="price">${admin.formatCurrency(order.total_amount)}</span>
                        <span class="time sub-item">Price</span>
                    </div>
                    <span class="status pending">${order.status}</span>
                </div>`

            document.querySelector('.orders-body').insertAdjacentHTML('beforeend', template)
                
        })
    }
}

async function switchPages(page){
    const pageData = await fetch(`../admin/pages/${page}.html`)
    const pageText = pageData.text()
    content.innerHTML = await pageText
}
navArray.forEach(el => {
    el.addEventListener('click', async () => {
        navArray.forEach(nav => nav.classList.remove('active'))
        el.classList.add('active')
        await switchPages(el.dataset.page)
        await initPageScript(el.dataset.page)
    })
})
await switchPages('dashboard')
await initPageScript('dashboard')

