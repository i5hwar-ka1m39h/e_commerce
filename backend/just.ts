import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient()
const hashgenerator = async(password:string)=>{
    try {
        const saltRound =5;
        const salt = await bcrypt.genSalt(saltRound);

        const hash = await bcrypt.hash(password, salt);
        return hash;
        
    } catch (error) {
        console.error('Error generating password hash:', error);
        throw error;
    }
}

const compareHash = async(plainPassword:string, hash:string )=>{
    const isMatch = await bcrypt.compare(plainPassword, hash);
    return isMatch;
}

const main = async()=>{
const hash1 = await hashgenerator("this_is_my_password")
console.log(hash1);

const ans = await compareHash("this_is_my_password", hash1)
console.log(ans);


}

const func = async()=>{
const result = await prisma.product.count();
console.log(result);

}

func()