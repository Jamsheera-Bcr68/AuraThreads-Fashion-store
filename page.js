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


<% if (orders && orders.length > 0) { %>
  <% orders.forEach(function(order) { %>
    <!-- Order Card -->
    <div class="order-card">
      <div class="order-header">
        <div>
          <strong>Order #<%= order._id %></strong>
          <div>
            Placed on: <%= new Date(order.orderDate).toLocaleDateString() %>
          </div>
        </div>
        <div>
          <span class="status">
            <%= order.status %>
          </span>
          <button class="btn-sm" onclick="showOrderDetails('<%= order._id %>')">
            View Details
          </button>
          <% if (order.canCancel && order.status !== 'Cancelled') { %>
            <button class="btn-sm cancel-btn" onclick="cancelOrder('<%= order._id %>', this)">
              Cancel Order
            </button>
          <% } else if (order.status === 'Cancelled') { %>
            <button class="btn-sm btn-secondary" disabled>
              Cancelled
            </button>
          <% } %>
        </div>
      </div>

      <div class="order-items">
        <div>
          <%= Array.isArray(order.items) ? order.items.length : 1 %> item<%= Array.isArray(order.items) && order.items.length > 1 ? 's' : '' %> |
          Total: $<%= order.totalAmount.toFixed(2) %>
        </div>
        <% if (order.estimatedDelivery) { %>
          <div>
            Estimated delivery: <%= new Date(order.estimatedDelivery).toLocaleDateString() %>
          </div>
        <% } %>
      </div>
    </div>
  <% }); %>
<% } else { %>
  <p>You haven't placed any orders yet.</p>
<% } %>