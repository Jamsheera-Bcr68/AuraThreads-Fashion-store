// Image Zoom Functionality
const mainImage = document.getElementById("main-image");
const zoomLens = document.getElementById("zoom-lens");
const zoomResult = document.getElementById("zoom-result");

if (mainImage && zoomLens && zoomResult) {
  mainImage.addEventListener("mousemove", zoomImage);
  mainImage.addEventListener(
    "mouseleave",
    () => (zoomResult.style.display = "none"),
  );

  function zoomImage(e) {
    const { left, top, width, height } = mainImage.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;

    zoomResult.style.display = "block";
    zoomResult.style.backgroundImage = `url(${mainImage.src})`;
    zoomResult.style.backgroundSize = `${width * 2}px ${height * 2}px`;
    zoomResult.style.backgroundPosition = `-${x * 2}px -${y * 2}px`;
  }
}

// Discount Calculation
const originalPrice = document.getElementById("original-price");
const discountPrice = document.getElementById("discount-price");
const discountTag = document.getElementById("discount-tag");

if (originalPrice && discountPrice && discountTag) {
  const original = parseFloat(originalPrice.textContent.replace("₹", ""));
  const discount = parseFloat(discountTag.textContent.replace("%", ""));

  const discountedPrice = original - original * (discount / 100);
  discountPrice.textContent = `₹${discountedPrice.toFixed(2)}`;
}

// Stock Availability Check
const stockStatus = document.getElementById("stock-status");
if (stockStatus) {
  if (stockStatus.textContent.toLowerCase() === "out of stock") {
    stockStatus.classList.add("text-red-500", "font-bold");
  } else if (stockStatus.textContent.toLowerCase() === "sold out") {
    stockStatus.classList.add("text-red-700", "font-bold");
  } else {
    stockStatus.classList.add("text-green-500", "font-bold");
  }
}

// Related Products Recommendation
const relatedProducts = document.getElementById("related-products");
if (relatedProducts) {
  fetch("/api/related-products")
    .then((response) => response.json())
    .then((data) => {
      data.forEach((product) => {
        const productCard = document.createElement("div");
        productCard.innerHTML = `
                    <div class="product-card">
                        <img src="${product.image}" alt="${product.name}" />
                        <h4>${product.name}</h4>
                        <p>₹${product.price}</p>
                    </div>
                `;
        relatedProducts.appendChild(productCard);
      });
    })
    .catch((err) => console.error("Error fetching related products:", err));
}
