import express,{Request, Response} from "express";
import { IRequest } from "../types/irequest";
import { prisma } from "..";

const router = express.Router();

router.get("/product/all", async(req:IRequest, res:Response)=>{
    const ammountOfProductOnPage  = 10;
    let pageNumerParam = req.query.pageNumber as string | undefined;
    let pageSizeParam = req.query.page_size as string | undefined
    try {
        const pageNumber = pageNumerParam ? parseInt(pageNumerParam) : 1;
        const page_size = pageSizeParam ? parseInt(pageSizeParam) : ammountOfProductOnPage;

        const offset = (pageNumber - 1) * page_size

        const totalCount = await prisma.product.count();
        const totalPages = Math.ceil(totalCount/page_size)

        const product = await prisma.product.findMany({
            take:page_size,
            skip:offset
        });

        if(!product || product.length === 0) res.status(404).json({message: "no product found"})
        res.status(200).json({message:"list of product", product, currentPage:pageNumber, totalPages: totalPages });
    } catch (error) {
        console.error(error);
        res.status(500).json({message : error}) 
    }
})


router.get("/product/:productId", async(req:IRequest, res:Response)=>{
    try {
        const productId = req.params.productId;

        const product = await prisma.product.findUnique({
            where:{
                productId:productId
            }
        })

        if(!product)res.status(404).json({message: "no product found"});
        res.status(200).json({message:"product found", product});

    } catch (error) {
        console.error(error);
        res.status(500).json({message : error}) 
    }
})

router.get("/product/:categorieId", async(req:IRequest, res:Response)=>{
    try {
        const categorieId = req.params.categorieId;
        const products = await prisma.product.findMany({
            where:{
                categoryId: categorieId
            }
        }) 
        if(!products)res.status(404).json({message: "no products found"});
        res.status(200).json({message:"products found", products});
    } catch (error) {
        console.error(error);
        res.status(500).json({message : error}) 
    }
})

export default router;