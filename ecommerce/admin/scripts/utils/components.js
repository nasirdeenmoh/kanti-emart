import { supabase } from "./config.js";

const user = {
    getUID: async () => {
        const {data: {session}} = await supabase.auth.getSession()
        const UID = session.user.id
        return UID
    },
    getName: async (uid) =>{
        const {data, error} = await supabase.from('profiles').select('full_name').eq('id', uid).single()
        if(error){
            return null
        }
        else{
            return data.full_name
        }
    },
    getRole: async (uid) => {
        const {data, error} = await supabase.from('profiles').select('role').eq('id', uid).single()
        if(!error){
            return data.role
        }
    }
}
const admin = {
    getProducts: async (uid) =>{
        const {data, error} = await supabase.from('products').select('*')
        if(!error){
            return data
        }
    },
    getSpecficProduct : async (id) => {
        const {data, error} = await supabase.from('products').select('*').eq('id', id).single()
        if(!error){
            return data
        }
    },
    getOrders: async () => {
        const {data, error} = await supabase.from('orders').select('*')
        if(!error){
            return data
        }
    },
    getOrderFromUser: async (uid) => {
        const {data, error} = await supabase.from('orders').select('*').eq('user_id', uid)
        if(!error){
            return data
        }
        else{
            alert('error')
        }
    },
    getUsers : async () => {
        const {data, error} = await supabase.from('profiles').select('*')
        if(!error){
            return data
        }
    },
    formatCurrency: (amount) => {
        const formatted = new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(amount)
        return formatted
    },
    approveOrder: async (orderId) => {
        const {data, error} = await supabase.from('orders').update({isApproved: true}).eq('id', orderId)
        if(!error){
            return 'approved'
        }
        else{
            return null
        }
    }
}
export { user, admin }