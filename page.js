const fs=require('fs')

fs.unlink('new.html',(err)=>{
   if(err){
    console.log(err);
    
   }else{
     console.log('file deleted');
   }
    
})

<% if (product.finalDiscount) { %>
                                            <span
                                                class="badge bg-warning text-dark position-absolute top-0 start-0 m-2">
                                                <% if (product.discountType==='percentage' ) { %>
                                                    <%= product.finalDiscount %>% OFF
                                                        <% } else { %>
                                                            ₹<%= product.finalDiscount %> OFF
                                                                <% } %>
                                            </span>
                                            <% } %>