const fs=require('fs')

fs.unlink('new.html',(err)=>{
   if(err){
    console.log(err);
    
   }else{
     console.log('file deleted');
   }
    
})