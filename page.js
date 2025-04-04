const express=require('express')
const app=express()
const path=require('path')

app.get('/',(req,res)=>{
  res.sendFile(path.join(__dirname,'account.html'))
})
app.get('/cloud',(req,res)=>{
  res.sendFile(path.join(__dirname,'cloud.html'))
})
app.listen(7000,()=>{
console.log('running');

}
)
