import { supabase } from "./config.js";


async function authenticateUser(){
    const {data, error} = await supabase.auth.getSession()
    if(error || !data.session){
        window.location.href = './auth/signin.html'
    }
    else{
        return
    }
}

export {authenticateUser}