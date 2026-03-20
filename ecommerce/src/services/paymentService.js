import { supabase } from './supabaseClient.js';
import { updateProductStock } from './productService.js';

export async function handleCheckout() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert('Please log in to proceed.');
        return;
    }

    const cartStr = localStorage.getItem('kanti_cart');
    const cart = cartStr ? JSON.parse(cartStr) : [];

    if (cart.length === 0) {
        alert('Your cart is empty.');
        return;
    }

    const deliveryModal = document.getElementById('deliveryModal');
    if (deliveryModal) deliveryModal.style.display = 'flex';
}

export async function initializePaystack(deliveryDetails) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const cartStr = localStorage.getItem('kanti_cart');
    const cart = cartStr ? JSON.parse(cartStr) : [];
    if (cart.length === 0) return;

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const amountInKobo = Math.round(totalAmount * 100);

    const btn = document.getElementById('proceedToPaystackBtn');
    const spinner = document.getElementById('paystackSpinner');
    const btnText = document.getElementById('paystackBtnText');

    if (btn) btn.disabled = true;
    if (spinner) spinner.style.display = 'inline-block';
    if (btnText) btnText.textContent = 'Processing...';

    let handler = PaystackPop.setup({
        key: 'pk_live_2cf2736bf5cb7cf98ec104f185502424611c0b2c',
        email: user.email,
        amount: amountInKobo,
        currency: 'NGN',
        ref: 'KP_' + Math.floor((Math.random() * 1000000000) + 1),
        callback: async function (response) {
            const paymentRef = response.reference;

            try {
                const { error: orderError } = await supabase
                    .from('orders')
                    .insert([{
                        user_id: user.id,
                        items: cart,
                        total_amount: totalAmount,
                        payment_reference: paymentRef,
                        status: 'paid',
                        street_address: deliveryDetails.streetAddress,
                        area_landmark: deliveryDetails.areaLandmark,
                        phone_number: deliveryDetails.phoneNumber,
                        delivery_instructions: deliveryDetails.deliveryInstructions
                    }]);

                if (orderError) throw orderError;

                for (const item of cart) {
                    try {
                        await updateProductStock(item.id, item.quantity);
                    } catch (err) {
                        console.error('Stock decrement error:', err);
                    }
                }

                localStorage.removeItem('kanti_cart');
                window.location.href = `success.html?ref=${paymentRef}`;
            } catch (err) {
                console.error("Order processing failed:", err);
                alert("Payment successful but error saving order. Reference: " + paymentRef);
                if (btn) btn.disabled = false;
                if (spinner) spinner.style.display = 'none';
                if (btnText) btnText.textContent = 'Proceed to Payment';
            }
        },
        onClose: function () {
            if (btn) btn.disabled = false;
            if (spinner) spinner.style.display = 'none';
            if (btnText) btnText.textContent = 'Proceed to Payment';
        }
    });

    handler.openIframe();
}
