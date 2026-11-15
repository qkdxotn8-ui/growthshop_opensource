const $ = (s) => document.querySelector(s);
const won = (n) => "₩" + Math.round(n || 0).toLocaleString("ko-KR");
const safe = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let products = [],
  reviews = [],
  category = "전체",
  visible = 16,
  selected = null,
  cart = JSON.parse(localStorage.getItem("editselect_cart") || "{}"),
  wishes = new Set(
    JSON.parse(localStorage.getItem("editselect_wishes") || "[]"),
  );
const productById = (id) =>
  products.find((p) => String(p.product_id) === String(id));
const save = () => {
  localStorage.setItem("editselect_cart", JSON.stringify(cart));
  localStorage.setItem("editselect_wishes", JSON.stringify([...wishes]));
};
function notify(msg) {
  $("#toast").textContent = msg;
  $("#toast").style.display = "block";
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(
    () => ($("#toast").style.display = "none"),
    2400,
  );
}
function filtered() {
  let q = $("#search").value.trim().toLowerCase();
  let arr = products.filter(
    (p) =>
      (category === "전체" || p.category_1 === category) &&
      (!q ||
        [p.product_name, p.brand_name_kr, p.brand_name_en].some((x) =>
          String(x || "")
            .toLowerCase()
            .includes(q),
        )),
  );
  let sort = $("#sort").value;
  if (sort === "priceAsc") arr.sort((a, b) => a.final_price - b.final_price);
  if (sort === "priceDesc") arr.sort((a, b) => b.final_price - a.final_price);
  if (sort === "reviews") arr.sort((a, b) => b.review_count - a.review_count);
  return arr;
}
function renderCategories() {
  let cats = ["전체", ...new Set(products.map((p) => p.category_1))];
  $("#categories").innerHTML = cats
    .map(
      (c) =>
        `<button data-cat="${safe(c)}" class="${category === c ? "active" : ""}">${safe(c)}</button>`,
    )
    .join("");
}
function render() {
  const arr = filtered();
  $("#resultCount").textContent = `${arr.length.toLocaleString()} ITEMS`;
  $("#products").innerHTML =
    arr
      .slice(0, visible)
      .map(
        (p) =>
          `<article class="product-card"><div class="product-image" data-open="${safe(p.product_id)}"><img src="${safe(p.image_url)}" alt="${safe(p.product_name)}" loading="lazy" onerror="this.style.opacity=.1"><span class="discount-tag">${Number(p.discount_rate) || 0}% OFF</span><button class="wish ${wishes.has(String(p.product_id)) ? "active" : ""}" data-wish="${safe(p.product_id)}" aria-label="찜">${wishes.has(String(p.product_id)) ? "♥" : "♡"}</button></div><div class="product-info"><div class="brand">${safe(p.brand_name_en || p.brand_name_kr)}</div><div class="product-name" data-open="${safe(p.product_id)}">${safe(p.product_name)}</div><div class="prices"><strong>${won(p.final_price)}</strong><del>${won(p.customer_price)}</del></div><div class="rating">★ ${Number(p.review_score || 0).toFixed(1)} · 리뷰 ${Number(p.review_count || 0).toLocaleString()}</div></div></article>`,
      )
      .join("") || "<p>검색 결과가 없습니다.</p>";
  $("#loadMore").hidden = visible >= arr.length;
}
function openLayer(el) {
  $("#backdrop").hidden = false;
  el.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeLayers() {
  $("#backdrop").hidden = true;
  $("#productModal").hidden = true;
  $("#checkoutModal").hidden = true;
  $("#cartDrawer").classList.remove("open");
  document.body.style.overflow = "";
}
function openProduct(id) {
  const p = productById(id);
  if (!p) return;
  selected = p;
  history.replaceState(null, "", `#product-${encodeURIComponent(id)}`);
  const rs = reviews
    .filter((r) => String(r.product_id) === String(id))
    .slice(0, 8);
  $("#productDetail").innerHTML =
    `<div class="detail-layout"><img class="detail-img" src="${safe(p.image_url)}" alt="${safe(p.product_name)}"><div class="detail-right"><span class="eyebrow">${safe(p.brand_name_en || p.brand_name_kr)}</span><h2>${safe(p.product_name)}</h2><div class="detail-price">${won(p.final_price)} <del>${won(p.customer_price)}</del></div><p>★ ${Number(p.review_score || 0).toFixed(2)} · 리뷰 ${Number(p.review_count || 0).toLocaleString()}개</p><div class="detail-meta">카테고리: ${safe([p.category_1, p.category_2, p.category_3].filter(Boolean).join(" / "))}<br>상품 ID: ${safe(p.product_id)}<br>이 상품은 수업용 데모 상품입니다.</div><button class="primary" id="detailAdd" style="margin-top:30px">ADD TO BAG →</button></div></div><div class="reviews"><h3>CUSTOMER REVIEWS (${rs.length}개 표시)</h3>${
      rs.length
        ? rs
            .map(
              (r) =>
                `<div class="review"><strong>★ ${Number(r.rating || 0)} / 5</strong> <small>${safe((r.created_at || "").slice(0, 10))}</small><p>${safe(r.review_text)}</p>${(
                  r.review_images || []
                )
                  .slice(0, 2)
                  .map(
                    (src) =>
                      `<img src="${safe(src)}" loading="lazy" alt="리뷰 이미지">`,
                  )
                  .join("")}</div>`,
            )
            .join("")
        : "<p>제공된 리뷰 데이터가 없습니다.</p>"
    }</div>`;
  $("#detailAdd").onclick = () => addCart(p.product_id);
  openLayer($("#productModal"));
}
function addCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  save();
  updateCart();
  notify("장바구니에 담았습니다.");
}
function updateCart() {
  let entries = Object.entries(cart).filter(
    ([id, q]) => q > 0 && productById(id),
  );
  let count = entries.reduce((a, [id, q]) => a + q, 0),
    total = entries.reduce(
      (a, [id, q]) => a + productById(id).final_price * q,
      0,
    );
  $("#cartCount").textContent = count;
  $("#cartTotal").textContent = won(total);
  $("#cartItems").innerHTML =
    entries
      .map(([id, q]) => {
        let p = productById(id);
        return `<div class="cart-line"><img src="${safe(p.image_url)}" alt=""><div><strong>${safe(p.product_name)}</strong><p>${won(p.final_price)}</p><div class="qty"><button data-qty="${safe(id)}" data-delta="-1">−</button>${q}<button data-qty="${safe(id)}" data-delta="1">+</button></div></div></div>`;
      })
      .join("") || "<p>장바구니가 비어 있습니다.</p>";
  $("#checkout").disabled = !count;
  return { entries, count, total };
}
function openCart() {
  closeLayers();
  updateCart();
  $("#backdrop").hidden = false;
  $("#cartDrawer").classList.add("open");
  document.body.style.overflow = "hidden";
}
function checkout() {
  const { entries, total } = updateCart();
  if (!entries.length) return;
  closeLayers();
  $("#checkoutContent").innerHTML =
    `<span class="eyebrow">DEMO CHECKOUT</span><h2>주문 확인</h2><p>총 ${entries.reduce((s, [id, q]) => s + q, 0)}개 상품 · <strong>${won(total)}</strong></p><p>실제 결제와 배송은 진행되지 않습니다. 입력하신 이름이나 연락처는 수집하지 않습니다.</p><button id="completeOrder" class="primary">모의 주문 완료</button>`;
  $("#completeOrder").onclick = () => {
    const orderId = "DEMO-" + Date.now();
    cart = {};
    save();
    updateCart();
    $("#checkoutContent").innerHTML =
      `<span class="eyebrow">ORDER COMPLETE</span><h2>모의 주문이 완료되었습니다.</h2><p>주문번호: ${orderId}</p><p>실제 결제나 배송은 진행되지 않습니다.</p><button class="primary" id="done">쇼핑 계속하기</button>`;
    $("#done").onclick = closeLayers;
  };
  openLayer($("#checkoutModal"));
}
async function init() {
  try {
    const files = [
      "products_001_100.json",
      "products_101_200.json",
      "reviews_001_100.json",
      "reviews_101_200.json",
    ];
    const result = await Promise.all(
      files.map(async (f) => {
        let res = await fetch("./data/" + f);
        if (!res.ok) throw Error(f + " 로드 실패");
        return res.json();
      }),
    );
    products = [...result[0], ...result[1]];
    reviews = [...result[2], ...result[3]];
    $("#heroVisual").style.backgroundImage =
      `linear-gradient(0deg,#0004,transparent 45%),url("${products[4]?.image_url || products[0]?.image_url}")`;
    renderCategories();
    render();
    updateCart();
    const id = decodeURIComponent(location.hash.replace("#product-", ""));
    if (location.hash.startsWith("#product-")) openProduct(id);
  } catch (err) {
    console.error(err);
    $("#products").innerHTML =
      "<p>데이터를 불러오지 못했습니다. 로컬 서버에서 실행해 주세요. (README 참고)</p>";
  }
}
$("#categories").onclick = (e) => {
  let b = e.target.closest("[data-cat]");
  if (!b) return;
  category = b.dataset.cat;
  visible = 16;
  renderCategories();
  render();
};
$("nav").onclick = (e) => {
  let b = e.target.closest("[data-category]");
  if (!b) return;
  category = b.dataset.category;
  visible = 16;
  renderCategories();
  render();
  $("#catalog").scrollIntoView();
};
$("#search").oninput = () => {
  visible = 16;
  render();
};
$("#sort").onchange = () => {
  render();
};
$("#loadMore").onclick = () => {
  visible += 16;
  render();
};
$("#products").onclick = (e) => {
  let w = e.target.closest("[data-wish]");
  if (w) {
    let id = w.dataset.wish;
    wishes.has(id) ? wishes.delete(id) : wishes.add(id);
    save();
    render();
    return;
  }
  let p = e.target.closest("[data-open]");
  if (p) openProduct(p.dataset.open);
};
$("#searchToggle").onclick = () => {
  $("#catalog").scrollIntoView();
  $("#search").focus();
};
$("#cartToggle").onclick = openCart;
$("#cartClose").onclick = closeLayers;
$("#modalClose").onclick = () => {
  closeLayers();
  history.replaceState(null, "", location.pathname + location.search);
};
$("#checkoutClose").onclick = closeLayers;
$("#backdrop").onclick = closeLayers;
$("#checkout").onclick = checkout;
$("#cartItems").onclick = (e) => {
  let b = e.target.closest("[data-qty]");
  if (!b) return;
  cart[b.dataset.qty] = Math.max(
    0,
    (cart[b.dataset.qty] || 0) + Number(b.dataset.delta),
  );
  save();
  updateCart();
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLayers();
});
init();
