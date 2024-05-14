import {faker} from '@faker-js/faker'
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';


const prisma = new PrismaClient();

const main = async()=>{

//category seeding  1st step
//     const categorySet = new Set();
//    const categories = await Promise.all(
//     Array.from({length:10}).map(async()=>{
//         let categoryName
//         do{
//             categoryName = faker.commerce.department()
//         }while(categorySet.has(categoryName));
//         categorySet.add(categoryName);
//         return prisma.category.create({
//             data:{
//                 categoryId:uuidv4(),
//                 categoryName: categoryName,
//                 categoryDescription: faker.lorem.words(20),
//             }
//         })
//     })
//    )
//console.log(categories);


//user seeding 2nd step
// const userNameSet = new Set();
// const userEmailSet = new Set();
// const users = await Promise.all(
//     Array.from({length:20}).map(async()=>{
//         let userName;
//         let userEmail;
//         do{
//             userName = faker.person.fullName();
//             userEmail = faker.internet.email();
//         }while(userNameSet.has(userName) || userEmailSet.has(userEmail));
//         userNameSet.add(userName);
//         userEmailSet.add(userEmail);
//         return prisma.user.create({
//             data:{
//                 userId:uuidv4(),
//                 userName:userName,
//                 email:userEmail,
//                 password: faker.internet.password(),
                
//             }
//         })
//     })
// )
// console.log(users);

//updating user to admin 3rd step
// const updatedUser = await prisma.user.updateMany({
//     where:{
//         userId:{in:['c507f44e-faa3-4283-977a-c5f28dde609b', 'bee766b1-455f-4af4-a721-405e1b84de50']}
//     },
//     data:{
//         isAdmin:true
//     }
// })
// console.log(updatedUser); //returns {count:2}


//to get the categoryId from the category table 
// const categories = await prisma.category.findMany();

// let categoriesId:string[]=[]
// categories.map(x=>{
//     categoriesId.push(x.categoryId);
//     return categoriesId;
// })

// const randomizer=(arr:string[]):string=>{
//     return arr[Math.floor(Math.random()*arr.length)];
// }

// const categoryForProduct = randomizer(categoriesId)






//seeding product 4th step
// const products = await Promise.all(
//     Array.from({length:50}).map(async()=>{
//         return prisma.product.create({
//             data:{
//                 productId:uuidv4(),
//                 productName: faker.commerce.productName(),
//                 productDescription: faker.lorem.words(10),
//                 productPrice: faker.commerce.price(),
//                 quantity: Math.floor(Math.random() * 100),
//                 adminId:'c507f44e-faa3-4283-977a-c5f28dde609b',
//                 categoryId: categoryForProduct,

//             }
//         })
//     })
// )
// console.log(products);




}




   
   
    



main().then(async()=>{
    await prisma.$disconnect()
}).catch(async(e)=>{
    console.error(e);
    await prisma.$disconnect()
    process.exit(1)
    
})


