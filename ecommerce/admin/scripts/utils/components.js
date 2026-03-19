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
    }
}
export { user, admin }