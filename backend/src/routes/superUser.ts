import express,{NextFunction, Request, Response} from "express";
import { IRequest } from "../types/irequest";

import { prisma } from "..";

const router = express.Router()

const isSuperUser = async(req:IRequest, res:Response, next:NextFunction)=>{
    const superUserString = 'I am the superUser'
    try {
        const incomingString = req.supeString;
        if(incomingString === superUserString){
            res.status(200).json({message:'welcome Master ^W^'});
        }
    } catch (error) {
        return res.status(403).json({ message: 'you messed up' });
    }

}


router.post("/createCategory", isSuperUser,  async(req:IRequest, res:Response)=>{
    try {
        const {categoryName, categoryDescription} = req.body;
        const category = await prisma.category.create({
            data:{
                categoryName:categoryName,
                categoryDescription:categoryDescription
            }
        })

        if(!category) res.status(422).json({message:"unable to create category"});
        res.status(200).json({message:"category created successfully", category})
    } catch (error) {
        console.error(error);
        res.status(500).json({message : error})  
    }
})

export default router;