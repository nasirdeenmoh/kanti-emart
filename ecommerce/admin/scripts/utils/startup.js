import { authenticateUser } from "./authGuard.js";
import { supabase } from "./config.js";
import {user} from './components.js'
async function startup() {
    const userId = await user.getUID()
    if(userId){
        const name = await user.getName(userId)
        const initials = name.split(' ')
        const role = await user.getRole(userId)
        document.querySelector('.name').innerHTML = name
        document.querySelector('.role').innerHTML = role
        document.querySelector('.profile').innerHTML = `${initials[0][0]}${initials[1][0]}`
    }
    else{
        authenticateUser()
    }
}

export {startup}