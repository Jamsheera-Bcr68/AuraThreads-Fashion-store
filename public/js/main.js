const csrfToken = document
  .querySelector('meta[name="csrf-token"]')
  .getAttribute("content");
AOS.init({
  duration: 800,
  easing: "slide",
  once: true,
});

jQuery(document).ready(function ($) {
  "use strict";

  var slider = function () {
    $(".nonloop-block-3").owlCarousel({
      center: false,
      items: 1,
      loop: false,
      stagePadding: 15,
      margin: 20,
      nav: true,
      navText: [
        '<span class="icon-arrow_back">',
        '<span class="icon-arrow_forward">',
      ],
      responsive: {
        600: {
          margin: 20,
          items: 2,
        },
        1000: {
          margin: 20,
          items: 3,
        },
        1200: {
          margin: 20,
          items: 3,
        },
      },
    });
  };
  slider();

  var siteMenuClone = function () {
    $('<div class="site-mobile-menu"></div>').prependTo(".site-wrap");

    $('<div class="site-mobile-menu-header"></div>').prependTo(
      ".site-mobile-menu",
    );
    $('<div class="site-mobile-menu-close "></div>').prependTo(
      ".site-mobile-menu-header",
    );
    $('<div class="site-mobile-menu-logo"></div>').prependTo(
      ".site-mobile-menu-header",
    );

    $('<div class="site-mobile-menu-body"></div>').appendTo(
      ".site-mobile-menu",
    );

    $(".js-logo-clone").clone().appendTo(".site-mobile-menu-logo");

    $('<span class="ion-ios-close js-menu-toggle"></div>').prependTo(
      ".site-mobile-menu-close",
    );

    $(".js-clone-nav").each(function () {
      var $this = $(this);
      $this
        .clone()
        .attr("class", "site-nav-wrap")
        .appendTo(".site-mobile-menu-body");
    });

    setTimeout(function () {
      var counter = 0;
      $(".site-mobile-menu .has-children").each(function () {
        var $this = $(this);

        $this.prepend('<span class="arrow-collapse collapsed">');

        $this.find(".arrow-collapse").attr({
          "data-toggle": "collapse",
          "data-target": "#collapseItem" + counter,
        });

        $this.find("> ul").attr({
          class: "collapse",
          id: "collapseItem" + counter,
        });

        counter++;
      });
    }, 1000);

    $("body").on("click", ".arrow-collapse", function (e) {
      var $this = $(this);
      if ($this.closest("li").find(".collapse").hasClass("show")) {
        $this.removeClass("active");
      } else {
        $this.addClass("active");
      }
      e.preventDefault();
    });

    $(window).resize(function () {
      var $this = $(this),
        w = $this.width();

      if (w > 768) {
        if ($("body").hasClass("offcanvas-menu")) {
          $("body").removeClass("offcanvas-menu");
        }
      }
    });

    $("body").on("click", ".js-menu-toggle", function (e) {
      var $this = $(this);
      e.preventDefault();

      if ($("body").hasClass("offcanvas-menu")) {
        $("body").removeClass("offcanvas-menu");
        $this.removeClass("active");
      } else {
        $("body").addClass("offcanvas-menu");
        $this.addClass("active");
      }
    });

    // click outisde offcanvas
    $(document).mouseup(function (e) {
      var container = $(".site-mobile-menu");
      if (!container.is(e.target) && container.has(e.target).length === 0) {
        if ($("body").hasClass("offcanvas-menu")) {
          $("body").removeClass("offcanvas-menu");
        }
      }
    });
  };
  siteMenuClone();

  function sitePlusMinus() {
    let quantity;

    document.querySelectorAll(".js-btn-minus").forEach((button) => {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        let inputField =
          this.closest(".input-group").querySelector(".form-control");
        let currentValue = parseInt(inputField.value, 10) || 0;

        if (currentValue > 1) {
          inputField.value = currentValue - 1;
          quantity = inputField.value;
          let productStock = 0;
          let productId = button.dataset.productid;
          const finalPrice = button.getAttribute("data-finalPrice");
          updateQuantity(quantity, productId, productStock, finalPrice);
        } else {
          inputField.value = 1;
        }
      });
    });

    document.querySelectorAll(".js-btn-plus").forEach((button) => {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        console.log("increse button clicked");

        let inputField =
          this.closest(".input-group").querySelector(".form-control");
        let currentValue = parseInt(inputField.value, 10) || 0;
        console.log("current value ", currentValue);

        let productStock = parseInt(button.dataset.max);
        console.log("productStock ", productStock);
        if (currentValue >= productStock) {
          Swal.fire("This product is Out of Stock");
        } else if (currentValue > 4) {
          Swal.fire("You can add only 5 of the same product");
        } else if (currentValue < 5) {
          inputField.value = currentValue + 1;
          quantity = inputField.value;
          let productId = button.dataset.productid;
          const finalPrice = button.getAttribute("data-finalPrice");

          updateQuantity(quantity, productId, productStock, finalPrice);
        }
      });
    });
  }

  function updateQuantity(quantity, productId, productStock, finalPrice) {
    console.log("from use updatequantity");
    console.log(
      `quantity is ${quantity} and product id is ${productId} productStock is ${productStock}`,
    );

    fetch(`/user/cart/update/${productId}/${quantity}`, {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "CSRF-Token": csrfToken,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) {
          Swal.fire("Error!", data.message, "error");
        } else {
          const totalCol = document.getElementById(`col-${productId}`);
          const cartItems = data.cartItems
          console.log("finalPrice", finalPrice);

          console.log('cartItems', cartItems);

          totalCol.innerHTML = (quantity * finalPrice).toFixed(2);
          let subTotal = document.getElementById('subTotal')
          const originalCartTotal = cartItems.reduce((acc, item) => acc + item.subTotal, 0)
          console.log(originalCartTotal);
          subTotal.innerText = originalCartTotal.toFixed(2)
          const netAmount = data.netAmount
          const totalDiscount = data.totalDiscount
          console.log('netAmount', netAmount, 'totalDiscount', totalDiscount);
          document.getElementById('offer').innerText = totalDiscount.toFixed(2)
          document.getElementById('updatedCartTotal').innerText = netAmount.toFixed(2)
        }
      })
      .catch((error) => {
        console.log("error in fetching data", error);
      });
  }

  sitePlusMinus();

  var siteSliderRange = function () {
    $("#slider-range").slider({
      range: true,
      min: 0,
      max: 500,
      values: [75, 300],
      slide: function (event, ui) {
        $("#amount").val("$" + ui.values[0] + " - $" + ui.values[1]);
      },
    });
    $("#amount").val(
      "$" +
      $("#slider-range").slider("values", 0) +
      " - $" +
      $("#slider-range").slider("values", 1),
    );
  };
  siteSliderRange();

  var siteMagnificPopup = function () {
    $(".image-popup").magnificPopup({
      type: "image",
      closeOnContentClick: true,
      closeBtnInside: false,
      fixedContentPos: true,
      mainClass: "mfp-no-margins mfp-with-zoom", // class to remove default margin from left and right side
      gallery: {
        enabled: true,
        navigateByImgClick: true,
        preload: [0, 1], // Will preload 0 - before current, and 1 after the current image
      },
      image: {
        verticalFit: true,
      },
      zoom: {
        enabled: true,
        duration: 300, // don't foget to change the duration also in CSS
      },
    });

    $(".popup-youtube, .popup-vimeo, .popup-gmaps").magnificPopup({
      disableOn: 700,
      type: "iframe",
      mainClass: "mfp-fade",
      removalDelay: 160,
      preloader: false,

      fixedContentPos: false,
    });
  };
  siteMagnificPopup();

  //from front end singlr product page

  // Image zoom functionality
  const mainImage = document.getElementById("productMainImage");
  mainImage.addEventListener("click", function () {
    this.classList.toggle("zoomed");
  });

  // Thumbnail switching
  const thumbnails = document.querySelectorAll(".thumbnail");
  thumbnails.forEach((thumbnail) => {
    thumbnail.addEventListener("click", function () {
      const imgSrc = this.getAttribute("data-img");
      document.getElementById("productMainImage").src = imgSrc;

      // Update active thumbnail
      document.querySelector(".thumbnail.active").classList.remove("active");
      this.classList.add("active");
    });
  });

  // Quantity buttons
  const decreaseBtn = document.getElementById("decreaseQty");
  const increaseBtn = document.getElementById("increaseQty");
  const quantityInput = document.getElementById("quantity");

  decreaseBtn.addEventListener("click", function () {
    let value = parseInt(quantityInput.value) || 1;
    if (value > 1) {
      quantityInput.value = value - 1;
    }
  });

  increaseBtn.addEventListener("click", function () {
    console.log("increse btn clicked");

    let value = parseInt(quantityInput.value) || 1;

    const productId = increaseBtn.dataset.productId;
    console.log("Product id is ", productId);

    const productStock = parseInt(increaseBtn.dataset.max);
    console.log("product stock= ", productStock);
    if (value > productStock - 1) {
      Swal.fire("Out of Stock");
    } else if (value > 4) {
      // to prevent exceeding 5
      Swal.fire("You Can't Add More than 5 Quantity");
    } else {
      quantityInput.value = value + 1;
    }
  });

  // Tab switching
  const tabButtons = document.querySelectorAll(".tab-button");
  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const tabId = this.getAttribute("data-tab");

      // Update active tab button
      document.querySelector(".tab-button.active").classList.remove("active");
      this.classList.add("active");

      // Update active tab content
      document.querySelector(".tab-content.active").classList.remove("active");
      document.getElementById(tabId).classList.add("active");
    });
  });

  document
    .getElementById("addToCartBtn")
    .addEventListener("click", function () {
      const productId = this.getAttribute("data-id");
      const quantity = parseInt(document.getElementById("quantity").value) || 1;

      if (quantity > 5) {
        return Swal.fire("You can add only up to 5 quantities");
      }

      fetch("/user/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ productId, quantity }),
      })
        .then((response) => response.json()) // Fixed JSON response handling
        .then((data) => {
          if (data && data.success) {
            Swal.fire({
              title: `Added ${quantity} item(s) to cart!`,
              text: "You can continue shopping or view your cart.",
              icon: "success",
              showCancelButton: true,
              confirmButtonText: "Show Cart",
              cancelButtonText: "OK",
              reverseButtons: true,
            }).then((result) => {
              if (result.isConfirmed) {
                window.location.href = "/user/cart";
              }
            });
          } else {
            Swal.fire(data.message);
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          Swal.fire("An error occurred. Please try again.");
        });
    });

  // Buy now functionality (demo)
  document
    .getElementById("buyNowBtn")
    .addEventListener("click", function () {
      const quantity = document.getElementById("quantity").value;
      Swal.fire(`Proceeding to checkout with ${quantity} item(s)!`);
    })
    .then(() => {
      window.location.href = "/user/checkout";
    });
});
// add to wishlist
function addToWishlist(productId) {
  console.log("prouct id is ", productId);

  fetch("/user/wishList/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ productId }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data && data.success) {
        Swal.fire({
          title: "Item Added to Wishlist!",
          text: "You can continue shopping or view your Wishlist.",
          icon: "success",
          showCancelButton: true,
          confirmButtonText: "Show Wishlist",
          cancelButtonText: "OK",
          reverseButtons: true,
        }).then((result) => {
          if (result.isConfirmed) {
            // Navigate to the wishlist page
            window.location.href = "/user/wishlist";
          }
        });
      } else {
        Swal.fire(data.message);
      }
    })
    .catch((error) => {
      Swal.fire("Server Error");
    });
}
// till this
//from cart.ejs
const removeBtns = document.querySelectorAll(".js-remove-item");
removeBtns.forEach((btn) =>
  btn.addEventListener("click", function (e) {
    e.preventDefault();
    let productId = this.getAttribute("data-id");
    console.log("prouct id is ", productId);

    Swal.fire({
      title: "Are you sure?",
      text: "This item will be removed from your cart!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, remove it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`/user/cart/remove/${productId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken,
          },
        })
          .then((response) => response.json())
          .then((data) => {
            if (data && data.success) {
              Swal.fire({

                icon: "success",
                title: data.message,
                showConfirmButton: false,
                timer: 1000
              })

              const row = document.getElementById(`row-${productId}`);
              if (row) row.remove();
              const cartItems = data.cartItems
              const count = cartItems.length || 0
              if (count == 0) {
                document.getElementById('cartHead').textContent = 'Your cart is empty.'
              }
              const subTotal = cartItems.reduce((acc, item) => acc + (item.productId.price * item.quantity), 0)
              console.log('cart items', cartItems);

              console.log('subTotal', subTotal);
              document.getElementById('subTotal').innerText = subTotal.toFixed(2)
              document.getElementById('offer').innerText = data.totalDiscount.toFixed(2)
              document.getElementById('updatedCartTotal').innerText = data.netAmount.toFixed(2)
            } else {
              Swal.fire("Error!", "Failed to remove the item.", "error");
            }
          })
          .catch((error) => {
            console.error("Error:", error);
          });
      }
    });
  }),
);

function applyCoupon(cartTotal) {
  console.log("apply Coupon button clicked");
  const inputCode = document.getElementById("coupon").value;
  console.log("cartTotal", cartTotal);

  console.log("inputCode", inputCode);
  if (!inputCode) {
    Swal.fire("Enter a Coupen code");
  } else {
    fetch(`/user/applyCoupon/${cartTotal}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ inputCode }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          let newCartTotal = data.newCartTotal;
          console.log("new cart total is ", newCartTotal);
          document.getElementById("discountAmount").textContent =
            data.discountAmount.toFixed(2);

          Swal.fire(data.message);
        } else {
          Swal.fire(data.message);
        }
      })
      .catch((error) => {
        console.log(error);
        Swal.fire("Server error");
      });
  }
}


//wishlist from product list

const cartButton = document.querySelectorAll('.addToCart')
cartButton.forEach(btn => btn.addEventListener('click', function () {
  console.log('cart button clicked');

  const productId = this.getAttribute('data-id')
  console.log('product id is', productId);

  fetch('/user/cart/add', {
    method: 'post',
    headers: {
      'content-Type': 'application/json',
      'CSRF-Token': csrfToken
    },
    body: JSON.stringify({ productId, quantity: Number(1) })
  }).then(response => response.json())
    .then(data => {
      if (data && data.success) {
        Swal.fire({
          title: "Item Added to Cart!",
          text: "You can continue shopping or view your cart.",
          icon: "success",
          showCancelButton: true,
          confirmButtonText: "Show Cart",
          cancelButtonText: "OK",
          reverseButtons: true // optional: puts "OK" on the left
        }).then((result) => {
          if (result.isConfirmed) {
            // Navigate to the cart page
            window.location.href = "/user/cart";
          }
          // else do nothing (OK just closes the alert)
        });
      } else {
        Swal.fire(data.message)
      }
    })


}))

document.addEventListener('DOMContentLoaded', function () {
  console.log('Main.js: DOM fully loaded');

  const wishlistIcons = document.querySelectorAll('.wishlist-icon');
  if (wishlistIcons.length) {
    wishlistIcons.forEach(icon => {
      icon.addEventListener('click', function () {
        const heart = this.querySelector('i');
        const productId = heart.getAttribute('data-id');
        const isNotInWishlist = heart.classList.contains('far');

        if (isNotInWishlist) {
          fetch('/user/wishList/add', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ productId })
          })
          .then(response =>response.json())
          .then(data=>{
            if(data && data.success){
              heart.classList.remove('far');
              heart.classList.add('fas', 'wishlist-true');
              Swal.fire({
                title: "Item Added to Wishlist!",
                text: "You can continue shopping or view your wishList.",
                icon: "success",
                showCancelButton: true,
                confirmButtonText: "Show wishlist",
                cancelButtonText: "OK",
                reverseButtons: true
              }).then(result => {
                if (result.isConfirmed) {
                  window.location.href = "/user/wishlist";
                }
              });
            }else{
               Swal.fire(data.message || 'Failed');
            }
          }).catch(err => {
            console.error(err);
            Swal.fire("Request failed");
          });

        } else {
          fetch(`/user/wishList/delete/${productId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ productId })
          })
          .then(response => {
            if (!response.ok) throw new Error(`Server responded ${response.status}`);
            return response.json();
          })
          .then(data => {
            if (data.success) {
              heart.classList.remove('fas', 'wishlist-true');
              heart.classList.add('far');
              Swal.fire({
                icon: "success",
                title: data.message || "Removed",
                showConfirmButton: false,
                timer: 1000
              });
            } else {
              Swal.fire(data.message || 'Failed to remove');
            }
          }).catch(err => {
            console.error(err);
            Swal.fire("Request failed");
          });
        }
      });
    });
  }

  const addToCartButtons = document.querySelectorAll('.btn-outline-primary');
  if (addToCartButtons.length) {
    addToCartButtons.forEach(button => {
      button.addEventListener('click', function (e) {
        const productCard = e.target.closest('.card');
        const productName = productCard.querySelector('.card-title').textContent;
        console.log(`Added ${productName} to bag`);
      });
    });
  }
});



