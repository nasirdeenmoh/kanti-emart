import { supabase } from "./config.js";
import { user } from "./components.js";

async function authenticateUser(){
    const {data, error} = await supabase.auth.getSession()
    if(error || !data.session){
        window.location.href = './auth/signin.html'
    }
    else{
        const uid = await user.getUID()
        const role = await user.getRole(uid)
        if (!role){
            window.location.href = './auth/signin.html'
        }
        else{
            document.querySelector('.container').classList.remove('loading')
            return
        }
        return
    }
}

export {authenticateUser}