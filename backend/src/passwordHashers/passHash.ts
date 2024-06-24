import bcrypt from 'bcrypt';


export const hashgenerator = async(password:string)=>{
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

export const hashCompare = async(inPass:string, hashFromDB:string)=>{
    try {
        const isMatch = await bcrypt.compare(inPass, hashFromDB);
        return isMatch;
    } catch (error) {
        console.error(error);
        throw error;
    }
}