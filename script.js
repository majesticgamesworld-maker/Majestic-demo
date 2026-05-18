/* ============================================================
   MAJESTIC GAMES & TOYS WORLD — Vanilla JavaScript Engine
   Replaces: React useState, useEffect, routing, context, hooks
   Features: SPA navigation, cart, search, hero slider,
             game finder, quick view modal, toast notifications
   ============================================================ */

'use strict';

/* ─────────────────────────────────────────────
   CART STATE  (replaces CartContext / useState)
───────────────────────────────────────────── */
var cart = [];
var CART_STORAGE_KEY = 'mgw_cart';
var wishlist = [];
var WISHLIST_STORAGE_KEY = 'mgw_wishlist';

function loadCart() {
  // Always start with empty cart to avoid stale data
  cart = [];
  try {
    var saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      var parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        cart = parsed;
      }
    }
  } catch(e) {
    cart = [];
  }
}

function saveCart() {
  try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)); } catch (e) {}
}

function getCartTotal() {
  return cart.reduce(function(sum, item) { return sum + item.price * item.qty; }, 0);
}

function getCartCount() {
  return cart.reduce(function(sum, item) { return sum + item.qty; }, 0);
}

function addToCart(product) {
  var existing = cart.find(function(i) { return i.id === product.id; });
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, qty: 1, img: getProductImg(product) });
  }
  saveCart();
  updateCartUI();
  showToast('Added to cart!', product.name + ' × 1', '🛒');
  confettiBurst();
}

function removeFromCart(id) {
  cart = cart.filter(function(i) { return i.id !== id; });
  saveCart();
  updateCartUI();
  renderCartItems();
}

function updateQty(id, delta) {
  var item = cart.find(function(i) { return i.id === id; });
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  updateCartUI();
  renderCartItems();
}

function clearCart() {
  cart = [];
  saveCart();
  updateCartUI();
  renderCartItems();
}

function loadWishlist() {
  wishlist = [];
  try {
    var saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
    var parsed = saved ? JSON.parse(saved) : [];
    wishlist = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (e) {
    wishlist = [];
  }
}

function saveWishlist() {
  try { localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist)); } catch (e) {}
}

function isWishlisted(id) {
  return wishlist.indexOf(id) !== -1;
}

function updateWishlistButtons() {
  document.querySelectorAll('[data-wishlist-id]').forEach(function(btn) {
    var id = btn.getAttribute('data-wishlist-id');
    var active = isWishlisted(id);
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.setAttribute('aria-label', active ? 'Remove from wishlist' : 'Save product');
  });
}

function toggleWishlist(id, btn) {
  var product = getProductById(id);
  if (!product) return;
  var index = wishlist.indexOf(id);
  var added = index === -1;
  if (added) {
    wishlist.push(id);
  } else {
    wishlist.splice(index, 1);
  }
  saveWishlist();
  updateWishlistButtons();
  showToast(added ? 'Saved to wishlist' : 'Removed from wishlist', product.name, added ? '&#9829;' : '&#9825;');
}

function initTopBanner() {
  var tracks = document.querySelectorAll('.top-banner .marquee-track');
  if (!tracks.length) return;
  var items = [
    '&#128666; Same-day Nairobi delivery',
    '&#127873; Free delivery over KES 8,000',
    '&#127922; Curated games, toys, puzzles and gifts',
    '&#128172; WhatsApp recommendations before you buy',
    '&#11088; New favourites added often',
    '&#128722; Easy ordering via WhatsApp'
  ];
  var markup = items.concat(items).map(function(item) {
    return '<span>' + item + '</span>';
  }).join('');
  tracks.forEach(function(track) {
    track.innerHTML = markup;
  });
}

/* ─────────────────────────────────────────────
   CART UI UPDATE
───────────────────────────────────────────── */
function updateCartUI() {
  var count = getCartCount();
  var total = getCartTotal();

  // Header badge
  var badge = document.getElementById('header-cart-badge');
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle('visible', count > 0);
  }

  // Drawer badge
  var drawerBadge = document.getElementById('cart-count-badge');
  if (drawerBadge) {
    drawerBadge.textContent = count + ' item' + (count !== 1 ? 's' : '');
    drawerBadge.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  // Total
  var totalEl = document.getElementById('cart-total-display');
  if (totalEl) totalEl.textContent = 'KES ' + total.toLocaleString();

  // Free delivery bar
  var freeBar = document.getElementById('free-delivery-bar');
  var freeText = document.getElementById('free-delivery-text');
  var freeFill = document.getElementById('free-delivery-fill');
  if (freeBar) {
    if (count > 0) {
      freeBar.style.display = 'block';
      var pct = Math.min(100, Math.round((total / FREE_DELIVERY_THRESHOLD) * 100));
      if (freeFill) { freeFill.style.width = pct + '%'; freeFill.classList.toggle('full', pct >= 100); }
      if (freeText) {
        if (total >= FREE_DELIVERY_THRESHOLD) {
          freeText.textContent = '🎉 You qualify for FREE delivery!';
          freeText.className = 'free-delivery-text achieved';
        } else {
          var remaining = FREE_DELIVERY_THRESHOLD - total;
          freeText.textContent = 'Add KES ' + remaining.toLocaleString() + ' more for FREE delivery';
          freeText.className = 'free-delivery-text pending';
        }
      }
    } else {
      freeBar.style.display = 'none';
    }
  }

  // Footer visibility
  var footer = document.getElementById('cart-footer');
  var emptyEl = document.getElementById('cart-empty');
  if (footer) footer.style.display = count > 0 ? 'block' : 'none';
  if (emptyEl) emptyEl.style.display = count > 0 ? 'none' : 'flex';

  // WhatsApp order link
  var waBtn = document.getElementById('cart-wa-btn');
  if (waBtn) {
    waBtn.href = buildCartWhatsAppURL();
    waBtn.onclick = openCheckoutDetailsModal;
  }
}

function buildCartWhatsAppURL() {
  return buildCartWhatsAppURLWithDetails({});
}

function buildCartWhatsAppURLWithDetails(details) {
  details = details || {};
  var lines = ['Hi Majestic Games World! I\'d like to order from the website cart:\n'];
  cart.forEach(function(item) {
    var product = getProductById(item.id);
    var productUrl = product ? getAbsoluteRouteUrl('product', product.id) : window.location.href;
    lines.push('- ' + item.name + ' x ' + item.qty + ' = KES ' + (item.price * item.qty).toLocaleString());
    lines.push('  SKU: ' + item.id);
    lines.push('  Link: ' + productUrl);
    lines.push('• ' + item.name + ' × ' + item.qty + ' = KES ' + (item.price * item.qty).toLocaleString());
  });
  lines = lines.filter(function(line) {
    return line.indexOf(' = KES ') === -1 || line.indexOf(' x ') !== -1;
  });
  lines.push('\nTotal: KES ' + getCartTotal().toLocaleString());
  lines.push('\nPlease confirm availability, delivery fee, payment steps, and fastest fulfilment option.');
  lines.push('Delivery area: ' + (details.deliveryArea || ''));
  lines.push('Needed by: ' + (details.neededDate || ''));
  lines.push('Payment preference: ' + (details.paymentPreference || ''));
  return buildWhatsAppURL(lines.join('\n'));
}

function getAbsoluteRouteUrl(page, param) {
  return new URL(getRouteUrl(page, param), window.location.href).href;
}

function buildWhatsAppURL(message) {
  return 'https://wa.me/254710707973?text=' + encodeURIComponent(message);
}

function ensureCheckoutDetailsModal() {
  var existing = document.getElementById('checkout-details-modal');
  if (existing) return existing;
  var zonePicker = renderCheckoutDeliverySelect();
  var paymentPicker = renderCheckoutPaymentSelect();
  var modal = document.createElement('div');
  modal.id = 'checkout-details-modal';
  modal.className = 'checkout-details-modal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML =
    '<div class="checkout-details-backdrop" onclick="closeCheckoutDetailsModal()"></div>' +
    '<form class="checkout-details-card" onsubmit="submitCheckoutDetails(event)" aria-labelledby="checkout-details-title">' +
      '<button type="button" class="checkout-details-close" onclick="closeCheckoutDetailsModal()" aria-label="Close checkout details">×</button>' +
      '<h2 id="checkout-details-title">Delivery details</h2>' +
      '<p>Tell us where and when you need the order before we open WhatsApp.</p>' +
      '<fieldset class="checkout-zone-picker">' +
        '<legend>Choose delivery area</legend>' +
        zonePicker +
        '<div id="checkout-zone-fee" class="checkout-zone-fee" aria-live="polite">Select a delivery area to see fee and timing.</div>' +
      '</fieldset>' +
      '<label for="checkout-delivery-area">Building, street or extra directions</label>' +
      '<input id="checkout-delivery-area" name="deliveryArea" placeholder="Sarit Centre, apartment name, office floor..." autocomplete="shipping address-line1" />' +
      '<label for="checkout-needed-date">Needed date</label>' +
      '<input id="checkout-needed-date" name="neededDate" required type="date" />' +
      '<label for="checkout-payment-preference">Payment preference</label>' +
      paymentPicker +
      '<button type="submit" class="checkout-details-submit">Continue to WhatsApp</button>' +
    '</form>';
  document.body.appendChild(modal);
  return modal;
}

function getCheckoutDeliveryGroups() {
  var groups = [{
    label: 'Store Pickup',
    fee: 0,
    time: 'Pickup',
    areas: ['Commerce House, Moi Avenue']
  }];
  if (typeof DELIVERY_ZONES !== 'undefined' && Array.isArray(DELIVERY_ZONES)) {
    groups = groups.concat(DELIVERY_ZONES.map(function(zone) {
      return {
        label: zone.label,
        fee: zone.fee,
        time: zone.time,
        areas: zone.areas.split(',').map(function(area) { return area.trim(); }).filter(Boolean)
      };
    }));
  }
  return groups.concat([
    { label: 'Central - KES 500', fee: 500, time: '1-2 days', areas: ['Thika', 'Kiambu', 'Limuru'] },
    { label: 'Coast - KES 700', fee: 700, time: '2-3 days', areas: ['Mombasa', 'Malindi', 'Kilifi'] },
    { label: 'Western - KES 600', fee: 600, time: '2-3 days', areas: ['Kisumu', 'Eldoret', 'Nakuru'] },
    { label: 'Eastern - KES 600', fee: 600, time: '2-3 days', areas: ['Meru', 'Embu', 'Machakos'] },
    { label: 'Other towns - KES 800', fee: 800, time: '3-4 days', areas: ['Other town'] }
  ]);
}

function renderCheckoutDeliverySelect() {
  return '<div class="checkout-zone-select" id="checkout-zone-select">' +
    '<input id="checkout-delivery-zone" name="deliveryChoice" type="hidden" />' +
    '<button type="button" class="checkout-zone-trigger" onclick="toggleCheckoutZoneMenu()" aria-expanded="false" aria-controls="checkout-zone-menu">' +
      '<span id="checkout-zone-label">-- Select your delivery area --</span>' +
      '<span aria-hidden="true">v</span>' +
    '</button>' +
    '<div id="checkout-zone-menu" class="checkout-zone-menu" role="listbox" aria-label="Delivery areas">' +
    getCheckoutDeliveryGroups().map(function(group) {
      var feeText = group.fee === 0 ? 'FREE' : 'KES ' + group.fee;
      var groupSummary = group.label + ' - ' + feeText + ' - ' + group.time;
      return '<div class="checkout-zone-group" role="group" aria-label="' + escHtml(groupSummary) + '">' +
        '<div class="checkout-zone-heading">' + escHtml(groupSummary) + '</div>' +
        group.areas.map(function(area) {
          var value = group.label + ' | ' + area + ' | ' + feeText + ' | ' + group.time;
          var summary = area + ' - ' + feeText + ' - ' + group.time;
          return '<button type="button" class="checkout-zone-option" role="option" data-value="' + escHtml(value) + '" data-summary="' + escHtml(summary) + '" onclick="selectCheckoutDeliveryArea(this)">' + escHtml(area) + '</button>';
        }).join('') +
      '</div>';
    }).join('') +
    '</div>' +
  '</div>';
}

function renderCheckoutPaymentSelect() {
  var options = ['M-Pesa', 'Cash on delivery', 'Card', 'Bank transfer'];
  return '<div class="checkout-payment-select" id="checkout-payment-select">' +
    '<input id="checkout-payment-preference" name="paymentPreference" type="hidden" />' +
    '<button type="button" class="checkout-payment-trigger" onclick="toggleCheckoutPaymentMenu()" aria-expanded="false" aria-controls="checkout-payment-menu">' +
      '<span id="checkout-payment-label">Choose payment</span>' +
      '<span aria-hidden="true">v</span>' +
    '</button>' +
    '<div id="checkout-payment-menu" class="checkout-payment-menu" role="listbox" aria-label="Payment preference">' +
      options.map(function(option) {
        return '<button type="button" class="checkout-payment-option" role="option" data-value="' + escHtml(option) + '" onclick="selectCheckoutPayment(this)">' + escHtml(option) + '</button>';
      }).join('') +
    '</div>' +
  '</div>';
}

function toggleCheckoutZoneMenu() {
  var wrap = document.getElementById('checkout-zone-select');
  var trigger = document.querySelector('.checkout-zone-trigger');
  if (!wrap || !trigger) return;
  closeCheckoutPaymentMenu();
  var isOpen = wrap.classList.toggle('open');
  trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function closeCheckoutZoneMenu() {
  var wrap = document.getElementById('checkout-zone-select');
  var trigger = document.querySelector('.checkout-zone-trigger');
  if (!wrap || !trigger) return;
  wrap.classList.remove('open');
  trigger.setAttribute('aria-expanded', 'false');
}

function selectCheckoutDeliveryArea(option) {
  var input = document.getElementById('checkout-delivery-zone');
  var label = document.getElementById('checkout-zone-label');
  if (!option || !input || !label) return;
  input.value = option.getAttribute('data-value') || '';
  label.textContent = option.textContent;
  document.querySelectorAll('.checkout-zone-option.selected').forEach(function(item) {
    item.classList.remove('selected');
    item.setAttribute('aria-selected', 'false');
  });
  option.classList.add('selected');
  option.setAttribute('aria-selected', 'true');
  updateCheckoutZoneFee(option.getAttribute('data-summary') || input.value);
  closeCheckoutZoneMenu();
}

function toggleCheckoutPaymentMenu() {
  var wrap = document.getElementById('checkout-payment-select');
  var trigger = document.querySelector('.checkout-payment-trigger');
  if (!wrap || !trigger) return;
  closeCheckoutZoneMenu();
  var isOpen = wrap.classList.toggle('open');
  trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function closeCheckoutPaymentMenu() {
  var wrap = document.getElementById('checkout-payment-select');
  var trigger = document.querySelector('.checkout-payment-trigger');
  if (!wrap || !trigger) return;
  wrap.classList.remove('open');
  trigger.setAttribute('aria-expanded', 'false');
}

function selectCheckoutPayment(option) {
  var input = document.getElementById('checkout-payment-preference');
  var label = document.getElementById('checkout-payment-label');
  if (!option || !input || !label) return;
  input.value = option.getAttribute('data-value') || '';
  label.textContent = input.value || 'Choose payment';
  document.querySelectorAll('.checkout-payment-option.selected').forEach(function(item) {
    item.classList.remove('selected');
    item.setAttribute('aria-selected', 'false');
  });
  option.classList.add('selected');
  option.setAttribute('aria-selected', 'true');
  closeCheckoutPaymentMenu();
}

function updateCheckoutZoneFee(value) {
  var feeEl = document.getElementById('checkout-zone-fee');
  if (!feeEl) return;
  if (!value) {
    feeEl.textContent = 'Select a delivery area to see fee and timing.';
    return;
  }
  feeEl.textContent = value.indexOf('|') === -1 ? value : value.split('|').map(function(part) { return part.trim(); }).slice(1).join(' - ');
}

function openCheckoutDetailsModal(event) {
  if (event) event.preventDefault();
  if (cart.length === 0) return;
  lastFocusedBeforeCheckout = document.activeElement;
  var modal = ensureCheckoutDetailsModal();
  var dateInput = document.getElementById('checkout-needed-date');
  if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  setTimeout(function() {
    var trigger = document.querySelector('.checkout-zone-trigger');
    if (trigger) trigger.focus();
  }, 30);
}

function closeCheckoutDetailsModal() {
  var modal = document.getElementById('checkout-details-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  if (lastFocusedBeforeCheckout && typeof lastFocusedBeforeCheckout.focus === 'function') lastFocusedBeforeCheckout.focus();
  lastFocusedBeforeCheckout = null;
}

function submitCheckoutDetails(event) {
  event.preventDefault();
  var form = event.currentTarget;
  var deliveryZone = form.deliveryChoice.value;
  var deliveryArea = form.deliveryArea.value.trim();
  var details = {
    deliveryArea: deliveryZone + (deliveryArea ? ' | Details: ' + deliveryArea : ''),
    neededDate: form.neededDate.value,
    paymentPreference: form.paymentPreference.value
  };
  if (!deliveryZone || !details.neededDate || !details.paymentPreference) {
    updateCheckoutZoneFee(deliveryZone || 'Please choose your delivery area before continuing.');
    return;
  }
  closeCheckoutDetailsModal();
  window.open(buildCartWhatsAppURLWithDetails(details), '_blank', 'noopener,noreferrer');
}

function buildProductWhatsAppMessage(product, qty, source) {
  qty = qty || 1;
  var cat = CATEGORIES.find(function(c) { return c.id === product.cat; });
  return [
    'Hi Majestic Games World! I need help ordering this item:',
    'Product: ' + product.name,
    'SKU: ' + product.id,
    'Category: ' + (cat ? cat.label : product.cat),
    'Quantity: ' + qty,
    'Price: KES ' + product.price.toLocaleString(),
    'Product link: ' + getAbsoluteRouteUrl('product', product.id),
    'Source: ' + (source || currentPage || 'website'),
    '',
    'Please confirm availability, delivery fee, payment steps, and fastest fulfilment option.',
    'Delivery area: ',
    'Needed by: '
  ].join('\n');
}

var EXACT_PRODUCT_METADATA_IDS = ['bg001', 'bg014', 'bg022', 'bg023', 'kg003', 'kg004'];

function getProductMetadataStatus(product) {
  var exact = product && EXACT_PRODUCT_METADATA_IDS.indexOf(product.id) !== -1;
  return {
    exact: exact,
    label: exact ? 'Exactly researched product details' : 'Catalogue guidance, not edition-verified',
    note: exact
      ? 'This description was individually researched for the title. Packaging, local stock and edition details should still be confirmed on WhatsApp before purchase.'
      : 'This description is based on the product title, category and safe catalogue assumptions. Exact edition, contents and packaging have not been individually verified yet.'
  };
}

function inferProductFacts(product, cat) {
  var text = [
    product.name,
    product.cat,
    product.ageGroup,
    product.difficulty,
    (product.tags || []).join(' '),
    (product.bestFor || []).join(' ')
  ].join(' ').toLowerCase();
  var adult = product.adult || product.safety === 'adult-only' || /adult|couple|romantic|intimate|drinking|bondage/.test(text);
  var kids = product.ageGroup === 'kids' || /kid|child|stem|doll|infant|toy/.test(text);
  var strategy = /chess|catan|azul|qwirkle|scrabble|monopoly|strategy|sequence|rummikub|risk/.test(text);
  var party = /party|taboo|articulate|seconds|bingo|cards|group|friends/.test(text);
  var couples = /couple|romantic|date|love/.test(text);
  var bestFor = (product.bestFor || []).slice(0, 4);
  if (!bestFor.length) {
    if (couples) bestFor = ['date nights', 'couples', 'anniversary gifts'];
    else if (kids) bestFor = ['kids', 'birthday gifts', 'screen-free play'];
    else if (strategy) bestFor = ['strategy lovers', 'family game nights', 'thoughtful gifts'];
    else if (party) bestFor = ['friends', 'parties', 'large groups'];
    else bestFor = ['home play', 'gifting', 'casual game nights'];
  }
  var occasion = couples ? 'Date night or couple gifting'
    : kids ? 'Birthdays, school breaks and family time'
    : party ? 'Parties, hangouts and team bonding'
    : strategy ? 'Family game night or strategy practice'
    : 'Gifts, weekend play and casual gatherings';
  var benefit = product.shortDescription || product.desc || product.description || '';
  if (!benefit || /for shoppers comparing physical games/.test(benefit)) {
    benefit = product.name + ' gives you a ready-to-play choice for ' + bestFor.slice(0, 2).join(' and ') + ', with simple buying support through WhatsApp and fast Nairobi delivery options.';
  }
  return {
    ageRange: product.age || (adult ? '18+' : kids ? '3-10 years' : '8+ years'),
    players: product.players || (couples ? '2 players' : strategy ? '2-4 players' : party ? '3+ players' : '2+ players'),
    playtime: product.playtime || (strategy ? '30-60 minutes' : party ? '15-30 minutes' : '20-40 minutes'),
    occasion: product.occasion || occasion,
    bestFor: bestFor,
    benefitDescription: benefit,
    categoryLabel: cat ? cat.label : product.cat
  };
}

function renderProductInfoGrid(facts) {
  var items = [
    ['Age range', facts.ageRange],
    ['Players', facts.players],
    ['Play time', facts.playtime],
    ['Occasion', facts.occasion],
    ['Best for', facts.bestFor.join(', ')]
  ];
  return '<div class="product-info-grid">' + items.map(function(item) {
    return '<div class="product-info-tile"><span>' + escHtml(item[0]) + '</span><strong>' + escHtml(item[1]) + '</strong></div>';
  }).join('') + '</div>';
}

function renderCartItems() {
  var list = document.getElementById('cart-items-list');
  if (!list) return;
  if (cart.length === 0) { list.innerHTML = ''; return; }

  list.innerHTML = cart.map(function(item) {
    return '<div class="cart-item" id="cart-item-' + item.id + '">' +
      '<div class="cart-item-img-wrap">' +
        '<img class="cart-item-img" src="' + item.img + '" alt="' + escHtml(item.name) + '" loading="lazy" />' +
      '</div>' +
      '<div class="cart-item-info">' +
        '<div class="cart-item-name">' + escHtml(item.name) + '</div>' +
        '<div class="cart-item-price">KES ' + item.price.toLocaleString() + '</div>' +
        '<div class="cart-item-controls">' +
          '<button class="qty-btn" onclick="updateQty(\'' + item.id + '\',-1)" aria-label="Decrease">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
          '</button>' +
          '<span class="qty-display">' + item.qty + '</span>' +
          '<button class="qty-btn" onclick="updateQty(\'' + item.id + '\',1)" aria-label="Increase">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
          '</button>' +
          '<button class="remove-item-btn" onclick="removeFromCart(\'' + item.id + '\')" aria-label="Remove">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

/* ─────────────────────────────────────────────
   CART DRAWER
───────────────────────────────────────────── */
function openCart() {
  lastFocusedBeforeCart = document.activeElement;
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('cart-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCartItems();
  setTimeout(function() {
    var drawer = document.getElementById('cart-drawer');
    if (drawer) drawer.focus();
  }, 30);
}

function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('open');
  document.body.style.overflow = '';
  if (lastFocusedBeforeCart && typeof lastFocusedBeforeCart.focus === 'function') lastFocusedBeforeCart.focus();
  lastFocusedBeforeCart = null;
}

/* ─────────────────────────────────────────────
   SPA NAVIGATION  (replaces React Router)
───────────────────────────────────────────── */
var currentPage = null;
var currentCategory = null;
var currentProduct = null;
var siteHeaderTemplateHtml = '';
var imageZoomScale = 1;
var SITE_ORIGIN = 'https://majesticgames.co.ke';
var DEFAULT_OG_IMAGE = SITE_ORIGIN + '/images/branding/LOGOF2.png';
var LOGO_TRANSPARENT_SRC = window.location.protocol === 'file:' ? 'images/branding/LOGOF2-transparent.png' : '/images/branding/LOGOF2-transparent.png';
var BRANDING_ASSET_BASE = window.location.protocol === 'file:' ? 'images/branding/' : '/images/branding/';
var PRODUCT_LOGO_SRC = LOGO_TRANSPARENT_SRC;
var lastFocusedBeforeCart = null;
var lastFocusedBeforeCheckout = null;

var CATEGORY_BG_MAP = {
  'board-games': 'images/background images/Board games.png',
  'card-games': 'images/background images/card games.png',
  'christian-games': 'images/background images/christian games.png',
  'couples-games': 'images/background images/card games.png',
  'dolls': 'images/background images/dolls.png',
  'drinking-games': 'images/background images/drinking games.png',
  'family-games': 'images/background images/family games.png',
  'infant-toys': 'images/background images/infant toys.png',
  'kids-games': 'images/background images/kids games.png',
  'lego-collectible': 'images/background images/LEGO collectibles.png',
  'musical-toys': 'images/background images/musical toys.png',
  'party-games': 'images/background images/party games.png',
  'puzzles': 'images/background images/puzzles.png',
  'stem-toys': 'images/background images/stem toys.png',
  'trivia-games': 'images/background images/trivia games.png'
};

var CATEGORY_CARD_ART_MAP = {
  'board-games': 'images/category-art/board-games.webp',
  'card-games': 'images/category-art/card-games.webp',
  'christian-games': 'images/category-art/christian-games.webp',
  'couples-games': 'images/category-art/couples-games.webp',
  'dolls': 'images/category-art/dolls.webp',
  'drinking-games': 'images/category-art/drinking-games.webp',
  'family-games': 'images/category-art/family-games.webp',
  'infant-toys': 'images/category-art/infant-toys.webp',
  'kids-games': 'images/category-art/kids-games.webp',
  'lego-collectible': 'images/category-art/lego-collectible.webp',
  'musical-toys': 'images/category-art/musical-toys.webp',
  'party-games': 'images/category-art/party-games.webp',
  'puzzles': 'images/category-art/puzzles.webp',
  'stem-toys': 'images/category-art/stem-toys.webp',
  'trivia-games': 'images/category-art/trivia-games.webp'
};

var CATEGORY_HERO_COPY = {
  'board-games': 'Strategy classics, family favorites, and modern tabletop picks for game nights that feel memorable.',
  'card-games': 'Fast, portable games for travel, parties, and easy play when you want quick fun with friends.',
  'christian-games': 'Faith-friendly games and activities for families, fellowships, youth groups, and thoughtful gifting.',
  'couples-games': 'Playful picks for date nights, bonding, conversation, and shared moments at home.',
  'dolls': 'Characterful dolls and pretend-play gifts chosen for imagination, comfort, and everyday play.',
  'drinking-games': 'Adult party games built for lively groups, bold laughs, and responsible 18+ fun.',
  'family-games': 'Easy-to-teach games that bring kids, teens, parents, and guests around the same table.',
  'infant-toys': 'Soft, safe early-play toys for sensory discovery, movement, comfort, and first milestones.',
  'kids-games': 'Bright, age-friendly games and toys that make learning, sharing, and playtime feel natural.',
  'lego-collectible': 'Buildable sets, collectible pieces, and display-worthy gifts for creative hands and collectors.',
  'musical-toys': 'Rhythm, sound, and music toys that make play more expressive for curious young learners.',
  'party-games': 'Crowd-pleasers for birthdays, hangouts, office socials, and high-energy group fun.',
  'puzzles': 'Relaxing puzzle picks for focus, gifting, family downtime, and satisfying screen-free challenges.',
  'stem-toys': 'Hands-on toys that support curiosity, problem solving, building, experiments, and creative learning.',
  'trivia-games': 'Question-led games for sharp minds, friendly competition, and groups that love a challenge.'
};

var INFO_PAGES = {
  'faqs': {
    kicker: 'Helpful answers',
    title: 'Frequently Asked Questions',
    intro: 'Quick answers about shopping with Majestic Games & Toys World, from product selection to delivery, payments, pickup, and after-sales help.',
    sections: [
      { title: 'Ordering', body: ['You can shop online, add products to cart, and contact us on WhatsApp when you need help confirming stock or choosing the right game.', 'For recommendations, tell us the age range, number of players, occasion, and budget. We will suggest options that fit the group and explain why they work.'] },
      { title: 'Delivery and pickup', body: ['Delivery options depend on location, order size, rider availability, and confirmation time. Store pickup is available from Commerce House, Moi Avenue, Nairobi.', 'Countrywide delivery can be arranged through courier partners. Timelines vary by town and product size.'] },
      { title: 'Payments', body: ['We support common local payment methods including M-Pesa, plus card and other checkout options where available.', 'Orders are processed after payment or confirmation, depending on the chosen fulfilment option.'] },
      { title: 'Product help', body: ['If a product has many versions, age ratings, or player-count differences, ask before checkout and we will help you choose the best fit.', 'Some adult or mature party games may not be suitable for children. Please check age guidance before buying.'] }
    ]
  },
  'privacy-policy': {
    kicker: 'Your information',
    title: 'Privacy Policy',
    intro: 'This page explains how Majestic Games & Toys World handles customer information when you browse, contact us, place an order, or ask for support.',
    sections: [
      { title: 'Information we collect', body: ['We may collect your name, phone number, delivery location, order details, messages, and payment confirmation details needed to process your order.', 'We may also use basic site analytics to understand product interest and improve the shopping experience.'] },
      { title: 'How we use information', body: ['Customer information is used to confirm orders, arrange delivery or pickup, respond to enquiries, recommend products, provide support, and prevent fraud.', 'We do not sell customer contact details. Information is shared only where needed to complete the service, such as with delivery or payment partners.'] },
      { title: 'Data care', body: ['We keep customer details only as long as needed for order records, support, legal, tax, or operational purposes.', 'You may contact us to update or request deletion of your personal information where retention is not required for legitimate business or legal reasons.'] },
      { title: 'Third-party links', body: ['The site may link to WhatsApp, social platforms, maps, payment services, and couriers. Their own privacy practices apply when you use those services.'] }
    ]
  },
  'refund-return-policy': {
    kicker: 'After-sales care',
    title: 'Refund & Return Policy',
    intro: 'We want every order to feel right. This policy covers returns, exchanges, damaged items, incorrect items, and refund handling.',
    sections: [
      { title: 'Return window', body: ['Please contact us as soon as possible after receiving your order if something is damaged, incorrect, incomplete, or not as expected.', 'Items should be unused, complete, and in original packaging unless the issue is damage or a fulfilment mistake.'] },
      { title: 'Damaged or wrong items', body: ['Send clear photos or videos of the item, packaging, and order details. We will review the issue and advise on replacement, exchange, refund, or return steps.', 'If we sent the wrong item or the product arrived damaged, we will work with you on a fair resolution.'] },
      { title: 'Non-returnable cases', body: ['Opened, used, incomplete, personalised, hygiene-sensitive, or customer-damaged items may not qualify for return.', 'Adult games, clearance items, and items bought for events may be limited to exchange or store credit depending on condition and timing.'] },
      { title: 'Refunds', body: ['Approved refunds are processed through the original or agreed payment method. Processing time may depend on the payment provider.', 'Delivery fees may be non-refundable unless the return is caused by our error or a damaged delivery.'] }
    ]
  },
  'terms-conditions': {
    kicker: 'Shopping terms',
    title: 'Terms & Conditions',
    intro: 'These terms guide use of the Majestic Games & Toys World website, product information, orders, pricing, delivery, and customer responsibilities.',
    sections: [
      { title: 'Website use', body: ['By using this website or placing an order, you agree to use the site lawfully and provide accurate order, contact, and delivery details.', 'Product images, descriptions, prices, and availability may change as stock changes or suppliers update packaging.'] },
      { title: 'Orders and pricing', body: ['Orders are subject to confirmation of stock, price, payment, and delivery availability.', 'If a pricing, stock, or description error occurs, we may contact you to correct the order, offer alternatives, or cancel and refund where appropriate.'] },
      { title: 'Delivery', body: ['Delivery estimates are provided in good faith and may be affected by location, traffic, courier schedules, weather, public holidays, and customer availability.', 'Customers should provide accurate delivery details and be reachable during fulfilment. Failed delivery attempts may attract additional charges.'] },
      { title: 'Liability', body: ['Games and toys should be used according to age guidance and safety instructions. Adult supervision may be required for children.', 'Majestic Games & Toys World is not liable for misuse of products, incorrect age selection, or losses beyond the value of the purchased item where permitted by law.'] }
    ]
  }
};

function getCategoryBackground(catId) {
  var imgPath = CATEGORY_BG_MAP[catId];
  return imgPath ? encodeURI(imgPath) : '';
}

function getCategoryCardArtwork(catId) {
  var imgPath = CATEGORY_CARD_ART_MAP[catId] || CATEGORY_BG_MAP[catId];
  return imgPath ? encodeURI(imgPath) : '';
}

function setPageHeroBackground(el, imgPath) {
  if (!el || !imgPath) return;
  el.style.setProperty('--page-hero-bg', "url('" + encodeURI(imgPath) + "')");
  el.style.setProperty('--cat-bg-image', "url('" + encodeURI(imgPath) + "')");
}

function renderCategoryCard(cat, extraStyle) {
  var bgImage = getCategoryCardArtwork(cat.id);
  var style = "--cat-bg-image:url('" + bgImage + "');";
  if (extraStyle) style += extraStyle;

  return '<a href="' + getRouteUrl('category', cat.id) + '" class="cat-card-link" style="' + style + '" onclick="event.preventDefault();navigate(\'category\',\'' + cat.id + '\')">' +
    '<span class="cat-icon">' + cat.icon + '</span>' +
    '<span class="cat-label">' + cat.label + '</span>' +
    '<span class="cat-count-label">' + cat.count + ' items</span>' +
  '</a>';
}

function getAppBasePath() {
  if (window.location.protocol === 'file:') return '';

  var path = window.location.pathname || '/';
  var segments = path.split('/').filter(Boolean);
  var decodedSegments = segments.map(function(part) {
    try { return decodeURIComponent(part); } catch (err) { return part; }
  });
  var pages = ['shop', 'bestsellers', 'new-arrivals', 'gift-picks', 'cart', 'contact', 'blog', 'faqs', 'privacy-policy', 'refund-return-policy', 'terms-conditions'];
  var productIndex = decodedSegments.indexOf('products');
  var categoryIndex = decodedSegments.indexOf('category');
  var routeIndex = productIndex !== -1 ? productIndex : categoryIndex;

  if (routeIndex !== -1) {
    return '/' + segments.slice(0, routeIndex).join('/') + (routeIndex ? '/' : '');
  }

  var last = decodedSegments[decodedSegments.length - 1] || '';
  if (/index\.html$/i.test(last)) {
    return '/' + segments.slice(0, -1).join('/') + (segments.length > 1 ? '/' : '');
  }
  if (pages.indexOf(last) !== -1) {
    return '/' + segments.slice(0, -1).join('/') + (segments.length > 1 ? '/' : '');
  }
  if (path.charAt(path.length - 1) === '/') return path;

  return '/';
}

function getRouteUrl(page, param) {
  if (window.location.protocol === 'file:') {
    if (page === 'home') return '#home';
    if (page === 'product' && param) return '#product/' + encodeURIComponent(param);
    if (page === 'category' && param) return '#category/' + encodeURIComponent(param);
    return '#' + encodeURIComponent(page);
  }

  var base = getAppBasePath();
  if (page === 'home') return base;
  if (page === 'product' && param) {
    var product = getProductById(param);
    return base + 'products/' + encodeURIComponent((product && product.slug) || param) + '/';
  }
  if (page === 'category' && param) return base + 'category/' + encodeURIComponent(param) + '/';
  return base + encodeURIComponent(page) + '/';
}

function getRouteFromLocation() {
  var params = new URLSearchParams(window.location.search || '');
  if (params.get('product')) return { page: 'product', param: params.get('product') };
  if (params.get('category')) return { page: 'category', param: params.get('category') };
  if (params.get('page')) return { page: params.get('page'), param: null };

  var cleanPath = (window.location.pathname || '').replace(/\/$/, '');
  var pathParts = cleanPath.split('/').filter(Boolean);
  var productIndex = pathParts.indexOf('products');
  if (productIndex !== -1 && pathParts[productIndex + 1]) {
    return { page: 'product', param: decodeURIComponent(pathParts[productIndex + 1]) };
  }
  var categoryIndex = pathParts.indexOf('category');
  if (categoryIndex !== -1 && pathParts[categoryIndex + 1]) {
    return { page: 'category', param: decodeURIComponent(pathParts[categoryIndex + 1]) };
  }
  var lastPart = pathParts[pathParts.length - 1];
  if (lastPart && !/index\.html$/i.test(lastPart)) {
    var pages = ['shop', 'bestsellers', 'new-arrivals', 'gift-picks', 'cart', 'contact', 'blog', 'faqs', 'privacy-policy', 'refund-return-policy', 'terms-conditions'];
    if (pages.indexOf(lastPart) !== -1) return { page: lastPart, param: null };
  }

  var hash = window.location.hash.replace('#', '');
  if (hash) {
    var parts = hash.split('/');
    return { page: parts[0] || 'home', param: parts[1] || null };
  }

  return { page: 'home', param: null };
}

function captureSiteHeaderTemplate() {
  var header = document.getElementById('site-header');
  if (header) siteHeaderTemplateHtml = header.outerHTML;
}

function ensureSiteHeader() {
  var header = document.getElementById('site-header');
  if (header) return header;
  if (!siteHeaderTemplateHtml) return null;

  var wrap = document.createElement('div');
  wrap.innerHTML = siteHeaderTemplateHtml;
  header = wrap.firstElementChild;
  var anchor = document.getElementById('site-header-anchor') || document.body;
  anchor.appendChild(header);
  initSearch();
  updateCartUI();
  return header;
}

function placeSiteHeader(page) {
  if (page === 'product') {
    var productHeader = ensureSiteHeader();
    if (!productHeader) return;
    var productAnchor = document.getElementById('site-header-anchor');
    if (productAnchor && productHeader.parentElement !== productAnchor) {
      productAnchor.appendChild(productHeader);
    }
    setHeaderLogoForPage(page);
    return;
  }

  var header = ensureSiteHeader();
  if (!header) return;

  if (page === 'home') {
    var hero = document.getElementById('hero-section');
    if (hero && header.parentElement !== hero) {
      hero.insertBefore(header, hero.firstChild);
    } else if (hero && hero.firstElementChild !== header) {
      hero.insertBefore(header, hero.firstChild);
    }
    return;
  }

  if (page === 'category') {
    var categoryHero = document.getElementById('category-hero-section');
    if (categoryHero && header.parentElement !== categoryHero) {
      categoryHero.insertBefore(header, categoryHero.firstChild);
    } else if (categoryHero && categoryHero.firstElementChild !== header) {
      categoryHero.insertBefore(header, categoryHero.firstChild);
    }
    return;
  }

  if (page === 'blog') {
    var blogHero = document.querySelector('#page-blog .blog-hero');
    if (blogHero && header.parentElement !== blogHero) {
      blogHero.insertBefore(header, blogHero.firstChild);
    } else if (blogHero && blogHero.firstElementChild !== header) {
      blogHero.insertBefore(header, blogHero.firstChild);
    }
    return;
  }

  var pageHeaderPages = ['shop', 'bestsellers', 'new-arrivals', 'gift-picks', 'cart', 'contact'];
  if (pageHeaderPages.indexOf(page) >= 0) {
    var pageHero = document.querySelector('#page-' + page + ' .page-header');
    if (pageHero && header.parentElement !== pageHero) {
      pageHero.insertBefore(header, pageHero.firstChild);
    } else if (pageHero && pageHero.firstElementChild !== header) {
      pageHero.insertBefore(header, pageHero.firstChild);
    }
    return;
  }

  if (INFO_PAGES[page]) {
    var infoHero = document.querySelector('#page-' + page + ' .info-hero');
    if (infoHero && header.parentElement !== infoHero) {
      infoHero.insertBefore(header, infoHero.firstChild);
    } else if (infoHero && infoHero.firstElementChild !== header) {
      infoHero.insertBefore(header, infoHero.firstChild);
    }
    return;
  }

  var anchor = document.getElementById('site-header-anchor');
  if (anchor && header.parentElement !== anchor) {
    anchor.appendChild(header);
  }
}

function navigate(page, param, skipHistory) {
  document.documentElement.removeAttribute('data-initial-page');

  if (currentPage === page && (page !== 'product' && page !== 'category' || (currentProduct === param || currentCategory === param))) {
    placeSiteHeader(page);
    updateSeoMeta(page, param);
    return;
  }

  if (!skipHistory) {
    window.history.pushState({ page: page, param: param }, '', getRouteUrl(page, param));
  }

  // Hide all pages
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });

  // Close overlays
  closeCart();
  closeMobileNav();
  closeShopDropdown();
  closeSearch();

  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(function(link) {
    link.classList.toggle('active', link.getAttribute('data-page') === page);
  });

  currentPage = page;
  document.body.setAttribute('data-page', page);
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Show the right page
  switch (page) {
    case 'home':
      showPage('home');
      break;
    case 'shop':
      showPage('shop');
      renderShop();
      break;
    case 'bestsellers':
      showPage('bestsellers');
      renderProductGrid('bestsellers-grid', getBestsellers(), 40);
      break;
    case 'new-arrivals':
      showPage('new-arrivals');
      renderProductGrid('new-arrivals-grid', getNewArrivals(), 40);
      break;
    case 'gift-picks':
      showPage('gift-picks');
      renderProductGrid('gift-picks-grid', getGiftPicks(), 40);
      break;
    case 'blog':
      showPage('blog');
      break;
    case 'faqs':
    case 'privacy-policy':
    case 'refund-return-policy':
    case 'terms-conditions':
      renderInfoPage(page);
      showPage(page);
      break;
    case 'category':
      currentCategory = param;
      showPage('category');
      renderCategoryPage(param);
      break;
    case 'product':
      currentProduct = param;
      showPage('product');
      renderProductPage(param);
      break;
    case 'cart':
      showPage('cart');
      renderCartPage();
      break;
    case 'contact':
      showPage('contact');
      renderContactPage();
      break;
    default:
      showPage('404');
  }

  // Some page renderers rebuild their page body, so seat the shared navbar
  // only after rendering to avoid destroying the header during innerHTML updates.
  placeSiteHeader(page);
  updateSeoMeta(page, param);
}

function showPage(name) {
  var el = document.getElementById('page-' + name);
  if (!el && INFO_PAGES[name]) {
    el = document.createElement('div');
    el.id = 'page-' + name;
    el.className = 'page';
    var footer = document.querySelector('.site-footer');
    if (footer && footer.parentNode) {
      footer.parentNode.insertBefore(el, footer);
    } else {
      document.body.appendChild(el);
    }
  }
  if (el) el.classList.add('active');

  setHeaderLogoForPage(name);
}

function setHeaderLogoForPage(page) {
  var nextLogo = page === 'product' ? PRODUCT_LOGO_SRC : LOGO_TRANSPARENT_SRC;
  document.querySelectorAll('.logo-img, .mobile-nav-logo img').forEach(function(logoImg) {
    logoImg.src = nextLogo;
  });
}

function updateSeoMeta(page, param) {
  var title = 'Majestic Games & Toys World - Board Games, Toys & Puzzles in Kenya';
  var desc = 'Shop board games, card games, puzzles, toys and party games in Kenya. Same-day delivery available in Nairobi from Majestic Games & Toys World.';
  var keywords = 'board games Kenya, card games Nairobi, puzzles Kenya, toys Nairobi, party games Kenya';
  var product = null;

  if (page === 'product') {
    product = getProductById(param);
    if (product) {
      title = product.name + ' | Buy Online in Kenya | Majestic Games';
      desc = (product.desc || '').slice(0, 155);
      keywords = (product.seoKeywords || []).join(', ');
    }
  } else if (page === 'category') {
    var cat = CATEGORIES.find(function(c) { return c.id === param; });
    if (cat) {
      title = cat.label + ' in Kenya | Majestic Games & Toys World';
      desc = 'Shop ' + cat.label.toLowerCase() + ' in Nairobi and across Kenya. Browse prices, gift picks and game-night favorites from Majestic Games & Toys World.';
      keywords = cat.label + ' Kenya, ' + cat.label + ' Nairobi, buy games online Kenya, Majestic Games';
    }
  } else if (page === 'shop') {
    title = 'Shop Games & Toys in Kenya | Majestic Games & Toys World';
  } else if (page === 'bestsellers') {
    title = 'Best Board Games & Toys in Kenya | Majestic Games Bestsellers';
  } else if (page === 'new-arrivals') {
    title = 'New Board Games, Card Games & Toys in Kenya | Majestic Games';
  } else if (page === 'gift-picks') {
    title = 'Gift Games & Toys in Kenya | Majestic Games Gift Picks';
  } else if (INFO_PAGES[page]) {
    title = INFO_PAGES[page].title + ' | Majestic Games & Toys World';
    desc = INFO_PAGES[page].intro;
    keywords = INFO_PAGES[page].title + ', Majestic Games Kenya, board games Nairobi, toys Kenya';
  }

  document.title = title;
  setMetaContent('description', desc);
  setMetaContent('keywords', keywords);
  var canonicalUrl = getAbsoluteSiteUrl(getRouteUrl(page, param));
  var ogImage = product ? getAbsoluteSiteUrl(getProductImg(product)) : DEFAULT_OG_IMAGE;
  setMetaProperty('og:title', title);
  setMetaProperty('og:description', desc);
  setMetaProperty('og:image', ogImage);
  setMetaProperty('og:url', canonicalUrl);
  setMetaContent('twitter:card', 'summary_large_image');
  setMetaContent('twitter:title', title);
  setMetaContent('twitter:description', desc);
  setMetaContent('twitter:image', ogImage);
  setCanonical(getRouteUrl(page, param));
  updateProductJsonLd(product);
}

function setMetaContent(name, content) {
  var el = document.querySelector('meta[name="' + name + '"]');
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content || '');
}

function setMetaProperty(prop, content) {
  var el = document.querySelector('meta[property="' + prop + '"]');
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', prop);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content || '');
}

function setCanonical(path) {
  var el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', getAbsoluteSiteUrl(path));
}

function getAbsoluteSiteUrl(path) {
  return new URL(path || '/', SITE_ORIGIN + '/').href;
}

function updateProductJsonLd(product) {
  var id = 'product-json-ld';
  var existing = document.getElementById(id);
  if (!product) {
    if (existing) existing.remove();
    return;
  }
  var cat = CATEGORIES.find(function(c) { return c.id === product.cat; });
  var facts = inferProductFacts(product, cat);
  var availability = product.availability === 'Out of Stock' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock';
  var productUrl = getAbsoluteRouteUrl('product', product.id);
  var categoryUrl = getAbsoluteRouteUrl('category', product.cat);
  var images = getProductImgAll(product).map(function(src) { return new URL(src, window.location.href).href; });
  var script = existing || document.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': productUrl + '#product',
        name: product.name,
        image: images,
        description: facts.benefitDescription,
        sku: product.id,
        category: facts.categoryLabel,
        brand: { '@type': 'Brand', name: 'Majestic Games & Toys World' },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'KES',
          price: product.price,
          availability: availability,
          url: productUrl,
          seller: { '@type': 'Organization', name: 'Majestic Games & Toys World' }
        }
      },
      {
        '@type': 'BreadcrumbList',
        '@id': productUrl + '#breadcrumb',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_ORIGIN + '/' },
          { '@type': 'ListItem', position: 2, name: facts.categoryLabel, item: categoryUrl },
          { '@type': 'ListItem', position: 3, name: product.name, item: productUrl }
        ]
      }
    ]
  });
  if (!existing) document.head.appendChild(script);
}
/* ─────────────────────────────────────────────
   PRODUCT CARD RENDERER
───────────────────────────────────────────── */
function getProductBadgeMarkup(product, inlineStyle) {
  var styleAttr = inlineStyle ? ' style="' + inlineStyle + '"' : '';
  var badges = '';

  if (product.badge === 'BESTSELLER') badges += '<span class="badge-bestseller"' + styleAttr + '>Bestseller</span>';
  else if (product.badge === 'NEW') badges += '<span class="badge-new"' + styleAttr + '>New Arrival</span>';
  else if (product.badge === 'GIFT PICKS') badges += '<span class="badge-gift"' + styleAttr + '>Gift Pick</span>';

  if (product.adult) badges += '<span class="badge-adult"' + styleAttr + '>18+</span>';

  return badges;
}

function renderProductCard(product) {
  var imgSrc = getProductImg(product);
  var badge = getProductBadgeMarkup(product);
  var availability = product.availability !== undefined ? product.availability : 'In Stock';
  var availClass = availability === 'Out of Stock' ? ' product-avail-out' : (availability === 'Low Stock' ? ' product-avail-low' : ' product-avail-in');
  var catLabel = (CATEGORIES.find(function(c) { return c.id === product.cat; }) || {}).label || product.cat;
  var productUrl = getRouteUrl('product', product.id);
  var popularity = product.badge === 'BESTSELLER' ? 'Customer favorite'
    : product.badge === 'GIFT PICKS' ? 'Popular gift pick'
    : product.cat === 'kids-games' || product.cat === 'family-games' ? 'Popular with families'
    : 'Popular pick';

  return '<article class="product-card">' +
    '<div class="product-img-wrap">' +
      '<a href="' + productUrl + '" class="product-card-media-link" onclick="event.preventDefault();navigate(\'product\',\'' + product.id + '\')" aria-label="View ' + escHtml(product.name) + '">' +
        '<img class="product-img" src="' + imgSrc + '" alt="' + escHtml(product.name) + '" loading="lazy" />' +
        '<div class="product-img-gradient"></div>' +
      '</a>' +
      '<div class="product-badges">' + badge + '</div>' +
      '<div class="product-quick-view">' +
        '<button class="quick-view-btn" onclick="event.preventDefault();event.stopPropagation();openQuickView(\'' + product.id + '\')" aria-label="Quick view ' + escHtml(product.name) + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
          'Quick View' +
        '</button>' +
      '</div>' +
      '<div class="product-cat-label">' + catLabel + '</div>' +
    '</div>' +
    '<div class="product-info">' +
      '<h3 class="product-name"><a href="' + productUrl + '" onclick="event.preventDefault();navigate(\'product\',\'' + product.id + '\')">' + escHtml(product.name) + '</a></h3>' +
      (product.shortDescription ? '<p class="product-card-desc">' + escHtml(product.shortDescription) + '</p>' : '') +
      '<div class="product-availability' + availClass + '">' + availability + '</div>' +
      '<div class="product-popularity">' + popularity + '</div>' +
      '<div class="product-footer">' +
        '<span class="product-price">KES ' + product.price.toLocaleString() + '</span>' +
        '<button class="add-to-cart-btn" onclick="event.preventDefault();event.stopPropagation();handleAddToCart(\'' + product.id + '\',this)">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>' +
          'Add' +
        '</button>' +
      '</div>' +
    '</div>' +
  '</article>';
}
function handleAddToCart(id, btn) {
  var product = getProductById(id);
  if (!product) return;
  if (btn) {
    btn.classList.add('adding');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Added!';
  }
  addToCart(product);
  setTimeout(function() {
    if (!btn) return;
    btn.classList.remove('adding');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg> Add';
  }, 1500);
}

function renderProductGrid(containerId, products, limit) {
  var el = document.getElementById(containerId);
  if (!el) return;
  if (el.getAttribute('data-prerendered') === 'true' && el.children.length) return;
  var items = limit ? products.slice(0, limit) : products;
  if (items.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎲</div><h3 class="empty-state-title">No products found</h3></div>';
    return;
  }
  el.innerHTML = items.map(renderProductCard).join('');
}

/* ─────────────────────────────────────────────
   HOME PAGE RENDERING
───────────────────────────────────────────── */
function renderHomePage() {
  // Categories grid
  var catGrid = document.getElementById('home-categories-grid');
  if (catGrid) {
    catGrid.innerHTML = CATEGORIES.map(renderCategoryCard).join('');
  }

  // Bestsellers (10 cards)
  renderProductGrid('home-bestsellers-grid', getBestsellers(), 10);

  // New Arrivals (10 cards)
  renderProductGrid('home-new-arrivals-grid', getNewArrivals(), 10);

  // Gift Picks (10 cards)
  renderProductGrid('home-gift-picks-grid', getGiftPicks(), 10);

  // Delivery zones
  var dzGrid = document.getElementById('delivery-zones-grid');
  if (dzGrid) {
    dzGrid.innerHTML = DELIVERY_ZONES.map(function(zone) {
      return '<div class="zone-card">' +
        '<div class="zone-label">' + zone.label + '</div>' +
        '<div class="zone-meta">' +
          '<span class="zone-fee">KES ' + zone.fee + '</span>' +
          '<span>⏱ ' + zone.time + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }
}

/* ─────────────────────────────────────────────
   SHOP PAGE
───────────────────────────────────────────── */
var shopFilter = 'all';
var shopSearch = '';

function initShopPage() {
  // Filter chips
  var chips = document.getElementById('shop-filter-chips');
  if (chips) {
    var allChips = [{ id: 'all', label: 'All Products' }].concat(CATEGORIES);
    chips.innerHTML = allChips.map(function(cat) {
      return '<button class="filter-chip' + (shopFilter === cat.id ? ' active' : '') + '" onclick="setShopFilter(\'' + cat.id + '\')">' +
        (cat.icon ? cat.icon + ' ' : '') + cat.label +
      '</button>';
    }).join('');
  }

  // Search input
  var searchInput = document.getElementById('shop-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      shopSearch = this.value;
      renderShop();
    });
    searchInput.value = shopSearch;
  }
}

function setShopFilter(catId) {
  shopFilter = catId;
  renderShop();
  // Update chip active states
  document.querySelectorAll('.filter-chip').forEach(function(chip, i) {
    var allCats = [{ id: 'all' }].concat(CATEGORIES);
    chip.classList.toggle('active', allCats[i] && allCats[i].id === catId);
  });
}

function clearShopFilters() {
  shopFilter = 'all';
  shopSearch = '';
  var input = document.getElementById('shop-search-input');
  if (input) input.value = '';
  renderShop();
}

function renderShop() {
  var sort = document.getElementById('shop-sort-select');
  var sortVal = sort ? sort.value : 'default';

  var products = shopFilter === 'all' ? PRODUCTS.slice() : getByCategory(shopFilter);

  if (shopSearch) {
    var q = shopSearch.toLowerCase();
    products = products.filter(function(p) {
      return p.name.toLowerCase().includes(q) || (p.desc && p.desc.toLowerCase().includes(q));
    });
  }

  // Sort
  if (sortVal === 'price-asc') products.sort(function(a, b) { return a.price - b.price; });
  else if (sortVal === 'price-desc') products.sort(function(a, b) { return b.price - a.price; });
  else if (sortVal === 'name') products.sort(function(a, b) { return a.name.localeCompare(b.name); });

  var grid = document.getElementById('shop-products-grid');
  var emptyState = document.getElementById('shop-empty-state');
  var countEl = document.getElementById('shop-result-count');

  if (countEl) countEl.textContent = products.length + ' product' + (products.length !== 1 ? 's' : '');

  if (products.length === 0) {
    if (grid) grid.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
  } else {
    if (emptyState) emptyState.style.display = 'none';
    if (grid) grid.innerHTML = products.map(renderProductCard).join('');
  }
}

/* ─────────────────────────────────────────────
   CATEGORY PAGE
───────────────────────────────────────────── */
function renderCategoryPage(catId) {
  var cat = CATEGORIES.find(function(c) { return c.id === catId; });
  if (!cat) { navigate('404'); return; }
  var heroBg = CATEGORY_BG_MAP[catId];

  var titleEl = document.getElementById('category-page-title');
  var subEl = document.getElementById('category-page-sub');
  var breadEl = document.getElementById('category-breadcrumb-name');
  var copyEl = document.getElementById('category-hero-copy');
  var headerEl = document.getElementById('category-page-header');
  var heroEl = document.getElementById('category-hero-section');
  var heroBgImg = document.getElementById('category-hero-bg');

  if (titleEl) titleEl.textContent = '';
  if (subEl) subEl.textContent = '';
  if (breadEl) breadEl.textContent = cat.label;
  if (copyEl) copyEl.textContent = CATEGORY_HERO_COPY[catId] || 'Explore curated picks selected for better play, easier gifting, and memorable moments.';
  setPageHeroBackground(headerEl, heroBg);
  setPageHeroBackground(heroEl, heroBg);
  if (heroBgImg && heroBg) heroBgImg.src = heroBg;

  // Adult warning
  var warning = document.getElementById('category-adult-warning');
  if (warning) warning.style.display = (catId === 'drinking-games' || catId === 'couples-games') ? 'block' : 'none';

  renderCategory();
}

function renderCategory() {
  if (!currentCategory) return;
  var sort = document.getElementById('category-sort-select');
  var sortVal = sort ? sort.value : 'default';

  var products = getByCategory(currentCategory).slice();
  if (sortVal === 'price-asc') products.sort(function(a, b) { return a.price - b.price; });
  else if (sortVal === 'price-desc') products.sort(function(a, b) { return b.price - a.price; });

  var grid = document.getElementById('category-products-grid');
  var emptyEl = document.getElementById('category-empty');
  var countEl = document.getElementById('category-count');

  if (countEl) countEl.textContent = products.length + ' product' + (products.length !== 1 ? 's' : '');

  if (products.length === 0) {
    if (grid) grid.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
  } else {
    if (emptyEl) emptyEl.style.display = 'none';
    if (grid) grid.innerHTML = products.map(renderProductCard).join('');
  }
}

/* ─────────────────────────────────────────────
   PRODUCT DETAIL PAGE
───────────────────────────────────────────── */
var productDetailQty = 1;

function getProductCommerceProfile(product, facts, cat) {
  var meta = inferProductMeta ? inferProductMeta(product) : { vibe: 'game night', players: facts.players, age: facts.ageRange };
  var text = getProductSearchText ? getProductSearchText(product).toLowerCase() : [product.name, product.cat, (product.tags || []).join(' ')].join(' ').toLowerCase();
  var strategy = /chess|catan|azul|qwirkle|scrabble|monopoly|sequence|rummikub|risk|strategy|backgammon|domino/.test(text);
  var party = /party|taboo|articulate|seconds|bingo|drinking|cards|group|friends/.test(text);
  var kids = product.ageGroup === 'kids' || /kid|child|learning|stem|toy|school/.test(text);
  var couples = /couple|date|romantic|love|intimate/.test(text);
  var gift = product.badge === 'GIFT PICKS' || /gift|birthday|present/.test(text);
  var vibe = couples ? 'Couple night' : party ? 'Party energy' : kids ? 'Kids learning' : strategy ? 'Strategy night' : gift ? 'Gift-ready pick' : 'Family game night';
  var subtitle = strategy
    ? 'A smart table pick for focused play, friendly rivalry and satisfying wins.'
    : party
      ? 'Built for laughter, quick rounds and the kind of nights people remember.'
      : kids
        ? 'Screen-free fun with learning, movement and easy gifting built in.'
        : couples
          ? 'A compact way to make date night warmer, playful and easier to plan.'
          : 'A ready-to-enjoy choice for gifting, hosting and relaxed family play.';
  var benefits = [];
  benefits.push(strategy ? ['Easy to start', 'Clear rules and a satisfying learning curve.'] : ['Easy to enjoy', 'Simple enough to get the table moving quickly.']);
  benefits.push(party ? ['Group energy', 'Keeps conversation and laughter moving.'] : ['Replayable', 'Works well beyond the first game night.']);
  benefits.push(gift || kids ? ['Great gift choice', 'A thoughtful pick for birthdays and surprises.'] : ['Confidence pick', 'A strong option when you want something reliable.']);
  benefits.push(strategy ? ['Brain challenge', 'Adds planning, pattern spotting and clever decisions.'] : ['Flexible occasion', 'Fits casual evenings, visits and family time.']);
  benefits.push(['WhatsApp guided', 'Confirm stock, edition and delivery before paying.']);
  var bestFor = ['Family Night', 'Birthday Gift'];
  if (couples) bestFor.unshift('Couple Night');
  if (party) bestFor.unshift('Party Games');
  if (kids) bestFor.push('School/Church Group');
  if (strategy) bestFor.push('Brain Challenge');
  bestFor = bestFor.filter(function(item, index, arr) { return arr.indexOf(item) === index; }).slice(0, 6);
  return {
    vibe: vibe,
    subtitle: subtitle,
    benefits: benefits,
    bestFor: bestFor,
    difficulty: product.difficulty || (strategy ? 'Easy-Medium' : 'Easy'),
    occasion: facts.occasion,
    matchUse: strategy ? 'Competitive strategy night' : party ? 'High-energy group hangout' : kids ? 'Kids learning or birthday gift' : couples ? 'Couple night or anniversary gift' : 'Family game night or gift shopper',
    why: 'Great for ' + facts.bestFor.slice(0, 2).join(', ') + ', especially when you want WhatsApp help confirming the best age, group size and delivery option before ordering.',
    meta: meta,
    category: cat ? cat.label : facts.categoryLabel
  };
}

function buildProductFitWhatsAppMessage(product, facts, focus) {
  var focusLine = focus ? 'Main thing I want checked: ' + focus + '.' : 'Main thing I want checked: overall fit.';
  return [
    'Hi Majestic Games World, I\'m interested in ' + product.name + ' priced at KES ' + product.price.toLocaleString() + '.',
    'Is it a good fit for ' + facts.ageRange + ', ' + facts.players + ', and this occasion: ' + facts.occasion + '?',
    focusLine,
    'Please confirm stock, delivery options, edition details, and whether you recommend it for my group.'
  ].join('\n');
}

function buildProductBundleWhatsAppMessage(product, budget, players, occasion) {
  return [
    'Hi Majestic Games World, I\'d like help building a game night bundle around ' + product.name + '.',
    'My budget is ' + (budget || 'not decided yet') + ', players are ' + (players || 'not decided yet') + ', and occasion is ' + (occasion || 'game night') + '.',
    'Please suggest the best bundle, confirm stock, delivery options, and total cost.'
  ].join('\n');
}

function getProductHowToPlaySteps(product, facts, profile) {
  var name = (product.name || '').toLowerCase();
  var cat = product.cat || '';
  var text = [name, cat, product.slug || '', product.shortDescription || '', product.description || ''].join(' ').toLowerCase();
  var match = function(pattern) { return pattern.test(text); };
  var steps = [
    { test: /azul/, play: ['Set out the factory displays and fill them with tiles from the bag.', 'On your turn, draft all tiles of one color from a display or the center.', 'Place drafted tiles into pattern rows, sending extras to the floor line.', 'Move completed rows to your wall and score connected tiles and completed sets.'] },
    { test: /catan/, play: ['Build the island, place settlements and collect starting resources.', 'Roll dice to produce brick, lumber, wool, grain or ore from matching terrain.', 'Trade with players or ports, then build roads, settlements, cities and development cards.', 'Reach 10 victory points first through building, longest road, largest army and cards.'] },
    { test: /monopoly deal/, play: ['Deal each player a hand of cards and keep the draw pile nearby.', 'On your turn, draw cards and play up to three actions, money or property cards.', 'Charge rent, steal properties or protect sets with action cards.', 'Win by completing three full property sets before the other players.'] },
    { test: /monopoly|cash flow|cashflow/, play: ['Choose tokens, give each player starting money and place tokens on GO.', 'Roll dice, move around the board and buy available properties you land on.', 'Collect rent, trade properties and build houses or hotels when you own color sets.', 'Win by managing cash well and bankrupting the other players.'] },
    { test: /scrabble|quiddler|boogle|boggle|hangman/, play: ['Give players letter tiles or cards according to the edition rules.', 'Build words by connecting letters to the board or forming valid word sets.', 'Score using letter values, premium spaces or word bonuses where included.', 'Refresh letters after each turn and win with the highest final score.'] },
    { test: /poker|playing cards|plastic cards/, play: ['Shuffle and deal cards for the poker or card game your group chooses.', 'Players bet, draw or reveal cards according to that game variant.', 'Compare hands using the agreed ranking, from pairs up to stronger combinations.', 'Win the pot or round with the best hand, smart bluff or last player remaining.'] },
    { test: /codenames/, play: ['Lay out the word grid and split players into two teams.', 'Spymasters use the key card to know which words belong to each team.', 'Give one-word clues with a number so teammates can guess related words.', 'Reveal agents carefully and avoid the assassin while racing to find your team.'] },
    { test: /dixit/, play: ['Deal illustrated cards and choose one player as storyteller each round.', 'The storyteller secretly picks a card and gives a clue inspired by the image.', 'Other players submit cards that could match the clue, then all cards are shuffled.', 'Vote for the storyteller card and score when the clue is balanced, not too obvious.'] },
    { test: /taboo/, play: ['Split into teams and choose a clue-giver for the round.', 'The clue-giver describes the guess word without saying any forbidden words.', 'Teammates guess as many cards as possible before the timer runs out.', 'Lose points for taboo words and score for correct guesses.'] },
    { test: /articulate|30 seconds|5 seconds|scattergories|tapple/, play: ['Split into players or teams and set up the timer or category cards.', 'Draw a prompt, category or card for the active player or team.', 'Race to describe, name or answer as many valid items as the rules allow.', 'Score successful answers and rotate turns until a winner or target score is reached.'] },
    { test: /cluedo|clue|suspect/, play: ['Set up the mystery cards, board and character pieces for the chosen edition.', 'Move through rooms or reveal clues to gather information.', 'Ask questions and use deduction to eliminate suspects, weapons and locations.', 'Make a final accusation when you know the solution.'] },
    { test: /uno|skip bo/, play: ['Deal cards and place a starter card or discard pile in the center.', 'On your turn, play a card that matches the current color, number or symbol.', 'Use action cards to skip, reverse, draw cards or change the current color.', 'Be first to empty your hand, remembering to call UNO when one card remains.'] },
    { test: /exploding kittens/, play: ['Deal cards, insert Exploding Kitten cards and create the draw pile.', 'Play action cards to skip, attack, peek, shuffle or force other moves.', 'End your turn by drawing from the deck unless a card says otherwise.', 'Defuse an Exploding Kitten if you can; the last player standing wins.'] },
    { test: /coup/, play: ['Deal influence cards face down and give each player starting coins.', 'Take actions by claiming character powers, bluffing if you dare.', 'Challenge suspicious claims or block actions with the right influence.', 'Lose influence when caught or targeted; the last player with influence wins.'] },
    { test: /sequence/, play: ['Deal cards and place chips near the game board.', 'Play a card from your hand and place a chip on the matching board space.', 'Use Jacks according to the edition rules to add or remove chips.', 'Win by forming the required connected sequence of chips.'] },
    { test: /rummikub/, play: ['Draw starting tiles and arrange them into runs and groups.', 'Make an initial meld that meets the edition point requirement.', 'On each turn, place valid sets or rearrange table tiles legally.', 'Be first to empty your rack to win the round.'] },
    { test: /qwirkle/, play: ['Draw tiles and create lines that share either color or shape.', 'Add tiles to existing lines without repeating a color-shape combination.', 'Score points for every tile in each line you extend.', 'Make a six-tile Qwirkle for a bonus and win with the highest score.'] },
    { test: /chess|battle chess|triangular chess/, play: ['Set up the pieces according to the board or edition layout.', 'Players alternate moves, using each piece according to its movement rule.', 'Plan attacks, defend important pieces and control key spaces.', 'Win by checkmating the opponent or meeting the edition victory condition.'] },
    { test: /draught|checkers/, play: ['Set pieces on the dark squares and move diagonally forward.', 'Jump over opposing pieces to capture them when possible.', 'Reach the far side to crown a piece as a king.', 'Win by capturing or blocking all opponent pieces.'] },
    { test: /backgammon/, play: ['Set up checkers on the points and roll dice to move them around the board.', 'Move according to the dice while blocking, hitting and re-entering checkers.', 'Bring all your checkers into your home board.', 'Bear off every checker first to win.'] },
    { test: /ludo|snakes|ladders/, play: ['Choose colors or tokens and place pieces at the start.', 'Roll the die and move according to the number shown.', 'Use ladders, snakes, safe spaces or captures according to the board edition.', 'Get all your pieces home or reach the finish first to win.'] },
    { test: /bingo/, play: ['Give each player a bingo card and set up the number caller.', 'Call numbers one at a time while players mark matching spaces.', 'Complete the required pattern such as a line, corners or full house.', 'Call bingo and verify the card to win the round.'] },
    { test: /domino/, play: ['Shuffle tiles face down and draw a starting hand.', 'Match tile ends with the same number of pips on the table.', 'Draw or pass when you cannot make a legal play.', 'Empty your hand first or score lowest when play is blocked.'] },
    { test: /jenga|tower|shut the box/, play: ['Set up the tower, box or dice tray on a stable surface.', 'Take turns carefully removing, rolling or choosing pieces according to the game.', 'Place pieces or close numbers without breaking the rules.', 'Avoid toppling the tower or aim for the lowest remaining score.'] },
    { test: /dart|foosball|connect 4|spin 4|line up/, play: ['Set up the target, board or tabletop arena on a safe flat surface.', 'Players take turns aiming, dropping discs or moving pieces.', 'Score by hitting target zones, connecting pieces or scoring goals.', 'Play to the agreed point target or round limit.'] },
    { test: /reversi|othello/, play: ['Place the starting discs in the center of the board.', 'Take turns placing discs that trap opponent discs in a line.', 'Flip every trapped disc to your color after each legal move.', 'Win by having the most discs when no legal moves remain.'] },
    { test: /mancala|ajua/, play: ['Place seeds or stones evenly in the pits.', 'Choose a pit and sow its contents one by one around the board.', 'Capture or collect seeds according to the local rule set being used.', 'Win by collecting the most seeds when the game ends.'] },
    { test: /pictionary|charades|hedbanz|guess in 10|what am i/, play: ['Split into players or teams and draw a prompt card.', 'Give clues by drawing, acting, asking questions or wearing the clue card.', 'Guess before the timer or question limit runs out.', 'Score correct guesses and rotate turns.'] },
    { test: /spot it|dobble|memory match/, play: ['Shuffle the cards or tiles and set up the chosen mini-game.', 'Look carefully for matching symbols, images or pairs.', 'Call out the match or collect the pair before other players do.', 'Win the most cards, matches or points.'] },
    { test: /twister/, play: ['Lay the mat flat and choose a spinner or caller.', 'Spin to choose a hand or foot and a color.', 'Place that limb on an open matching circle without falling.', 'Stay balanced the longest to win.'] },
    { test: /tangram|tetris|ubongo|puzzle|jigsaw/, play: ['Choose a puzzle, challenge card or reference image.', 'Sort pieces by color, edge, shape or pattern.', 'Fit pieces together until the image or target shape is complete.', 'For timed editions, finish before the timer or score fastest completion.'] },
    { test: /beer pong|drinko|spin the bottle|truth or drink|you laugh you drink|you lie you drink|these cards will get you drunk|buzzed|sotally|do or drink|let's get drunk|risk it or drink|drunken|drunk|drinking|drink/, play: ['Confirm all players are adults and agree on house limits before starting.', 'Set up cups, cards, spinner or prompts according to the edition.', 'Take turns drawing prompts, aiming, answering or completing challenges.', 'Apply the drink, point or penalty rule, and keep play responsible.'] },
    { test: /cards against|what do you meme|incohearent|bad people|bad choices|disturbed friends|never have i ever|for the girls|that'?s what she said|truth or dare|do you know me|top of mind|brilliant or bs|i should have known|things they don't teach|lyrically correct|trivia trolls|f\*ck marry kill|fill in the blank|fill in the blanks/, play: ['Shuffle the prompt and answer decks or set up the question cards.', 'One player reads the prompt, question or challenge for the round.', 'Other players answer, submit cards, vote or guess according to the edition.', 'Award the round to the funniest, most accurate or correct response.'] },
    { test: /couple|date|intimacy|love language|talk flirt dare|bedroom|naughty|sexmate|loopy|dirty minds|servd|his & hers|risky|bondage|positions|poker sex/, play: ['Confirm the game is suitable for adults and that both players are comfortable.', 'Shuffle the cards or prompts and choose the mode suggested by the edition.', 'Take turns answering questions, completing dares or choosing playful challenges.', 'Skip any prompt you do not want and use the game to create conversation.'] },
    { test: /talking point|our moments|conversation|ice breaker|let'?s get talking|little talk|mindful talk|talking hearts|christian culture|get churched|bible|do you really know your|we'?re not really strangers/, play: ['Shuffle the conversation or prompt cards.', 'Take turns drawing a card and reading it aloud.', 'Answer honestly, discuss as a group and invite follow-up questions.', 'Continue for a set time or until everyone has shared.'] },
    { test: /lego|construction set|speed champions|ferrari|pagani|koenigsegg|red bull|mercedes|williams|iron man|wolverine|bulldozer/, play: ['Open the numbered bags and sort key pieces if needed.', 'Follow the build booklet step by step.', 'Attach stickers or small details carefully as the model develops.', 'Display the finished model or use it for imaginative play.'] },
    { test: /4m|science kit|robot|rocket|wind chime|bracelet|weather|electric plane|turboair|rock painting|stem/, play: ['Read the included instructions and prepare a safe workspace.', 'Lay out the materials and complete each experiment or build step in order.', 'Test, observe and adjust the model or craft as instructed.', 'Use adult supervision for small parts, batteries, paint or launch activities.'] },
    { test: /barbie|doll|camper|doctor|fashionistas|beauty compact|pibi/, play: ['Unpack the doll and accessories carefully.', 'Set up the scene, outfit or playset pieces.', 'Use role-play to create stories, jobs, visits or adventures.', 'Pack small accessories together after play to avoid losing pieces.'] },
    { test: /microphone|keyboard|piano|saxophone|musical/, play: ['Add batteries or connect power if required.', 'Choose a sound mode, rhythm or instrument setting.', 'Sing, play notes or copy simple melodies.', 'Use volume safely and store accessories after play.'] },
    { test: /rattle|baby|infant|soft ball|peacock/, play: ['Give the toy to the child during supervised play.', 'Encourage grasping, rolling, shaking or gentle sensory exploration.', 'Use colors, sounds and movement to support early interaction.', 'Clean and store the toy after use according to care guidance.'] }
  ];
  var found = steps.find(function(rule) {
    return rule.test && typeof rule.test.test === 'function' && rule.test.test(text);
  });
  if (found) return found.play;
  if (cat === 'puzzles') return ['Sort edge pieces, colors and obvious patterns first.', 'Build the border or main shapes before filling smaller details.', 'Work section by section until the image comes together.', 'Use the finished puzzle for display, replay or relaxed family time.'];
  if (cat === 'stem-toys') return ['Read the kit instructions before opening all parts.', 'Build or prepare the experiment one step at a time.', 'Test the result, observe what happens and adjust if needed.', 'Use adult supervision where tools, batteries or small parts are included.'];
  if (cat === 'kids-games') return ['Set up the pieces and explain the goal in simple terms.', 'Take turns so younger players can learn the pattern of play.', 'Use the cards, board or prompts to practice matching, memory or quick thinking.', 'Celebrate completion, correct answers or the agreed winning condition.'];
  if (cat === 'party-games') return ['Choose teams or a round leader.', 'Draw a prompt, question or challenge card.', 'Players answer, guess, vote or complete the challenge.', 'Score the round and keep rotating so everyone participates.'];
  if (cat === 'trivia-games') return ['Shuffle the question cards and choose a reader or teams.', 'Read each question aloud and let players answer before the reveal.', 'Award points for correct answers or for spotting the bluff, depending on the edition.', 'Keep rotating readers until someone reaches the target score.'];
  if (cat === 'drinking-games') return ['Confirm everyone is an adult and agrees on sensible limits before starting.', 'Set up the cards, cups, spinner or challenge pieces for the edition.', 'Take turns drawing prompts, answering questions or completing challenges.', 'Apply the drink, point or penalty rule while keeping the game responsible.'];
  if (cat === 'couples-games') return ['Choose a comfortable mode or deck for the mood you want.', 'Take turns drawing cards, asking questions or choosing playful challenges.', 'Answer honestly, complete agreed dares or skip anything that does not feel right.', 'Use the game to spark conversation, laughter and connection.'];
  if (cat === 'christian-games') return ['Set up the cards or board and choose a reader or teams.', 'Take turns answering faith, culture or Bible-themed prompts.', 'Discuss answers respectfully and use any special action cards as directed.', 'Score correct answers, completed sequences or won rounds according to the edition.'];
  if (cat === 'card-games' || cat === 'family-games') return ['Shuffle and deal the cards according to the edition.', 'Take turns playing cards, answering prompts or completing the round objective.', 'Use action cards or special rules when they appear.', 'Win by emptying your hand, scoring most points or winning the most rounds.'];
  if (cat === 'board-games') return ['Set up the board, pieces, cards and player tokens for the edition.', 'Take turns moving, placing pieces, drawing cards or resolving spaces as directed.', 'Use the game rules to score, block, trade, capture or complete objectives.', 'Win by reaching the listed score, finishing first or meeting the victory condition.'];
  return ['Open the box and confirm the included pieces match the edition.', 'Read the quick rules or first card before starting.', 'Take turns using the pieces, cards or prompts as directed.', 'Play to the listed win condition, timer or agreed family rule.'];
}

function updateMajesticBuddyInsight(mode) {
  var product = getProductById(currentProduct);
  if (!product) return;

  var cat = CATEGORIES.find(function(c) { return c.id === product.cat; });
  var facts = inferProductFacts(product, cat);
  var profile = getProductCommerceProfile(product, facts, cat);
  var modes = {
    overall: {
      title: 'Strong fit for this table.',
      text: profile.why,
      focus: 'overall fit for my group'
    },
    age: {
      title: 'Check age fit before ordering.',
      text: 'Majestic Buddy will confirm whether ' + product.name + ' is right for ' + facts.ageRange + ', including safety, maturity level and who should supervise play.',
      focus: 'age suitability and safety'
    },
    players: {
      title: 'Check if the group size works.',
      text: 'Best listed player fit is ' + facts.players + '. Ask Buddy to confirm whether it will still feel good for your exact group size and table setup.',
      focus: 'player count and table setup'
    },
    delivery: {
      title: 'Check stock and delivery timing.',
      text: 'Buddy can confirm live stock, edition details, Nairobi delivery timing, Kenya-wide courier options and the final delivery fee before you pay.',
      focus: 'stock, edition and delivery timing'
    },
    gift: {
      title: 'Check if it is gift-ready.',
      text: 'Buddy will confirm whether this is a good gift for ' + facts.bestFor.slice(0, 2).join(' or ') + ', and suggest a better option if the recipient needs something different.',
      focus: 'gift suitability and better alternatives if needed'
    }
  };
  var selected = modes[mode] || modes.overall;
  var titleEl = document.getElementById('pdp-buddy-insight-title');
  var verdictEl = document.getElementById('pdp-buddy-verdict');
  var ctaEl = document.getElementById('pdp-insight-wa');
  if (titleEl) titleEl.textContent = selected.title;
  if (verdictEl) verdictEl.textContent = selected.text;
  if (ctaEl) {
    ctaEl.href = buildWhatsAppURL(buildProductFitWhatsAppMessage(product, facts, selected.focus));
    ctaEl.textContent = mode === 'overall' ? 'Confirm fit on WhatsApp' : 'Ask Buddy to check this';
  }
  document.querySelectorAll('.pdp-buddy-check-btn').forEach(function(btn) {
    var isActive = btn.getAttribute('data-buddy-check') === (mode || 'overall');
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function renderPdpCompactCard(product, label) {
  if (!product) return '';
  return '<article class="pdp-mini-card">' +
    '<a href="' + getRouteUrl('product', product.id) + '" onclick="event.preventDefault();navigate(\'product\',\'' + product.id + '\')" aria-label="View ' + escHtml(product.name) + '">' +
      '<img src="' + getProductImg(product) + '" alt="' + escHtml(product.name) + '" loading="lazy" />' +
      '<span>' + escHtml(label || 'Pairs well') + '</span>' +
      '<strong>' + escHtml(product.name) + '</strong>' +
      '<em>KES ' + product.price.toLocaleString() + '</em>' +
    '</a>' +
  '</article>';
}

function getPdpIcon(name) {
  var icons = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>',
    cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.6 13.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.8a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.4-4.9A8.4 8.4 0 1 1 20.5 11.8Z"/><path d="M8.8 8.4c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .5.4l.8 1.8c.1.2.1.4 0 .5l-.4.6c-.1.2-.2.3-.1.5.4.8 1.2 1.7 2.2 2.2.2.1.4.1.5-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.8c.3.1.4.3.3.6-.1.7-.7 1.4-1.4 1.5-1.2.2-3-.4-4.5-1.7-1.6-1.4-2.8-3.3-2.9-4.6 0-.4.1-.7.2-.8Z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 6l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.3 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
    age: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    sliders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21v-6M4 11V3M12 21v-9M12 8V3M20 21v-4M20 13V3"/><path d="M2 15h4M10 8h4M18 17h4"/></svg>',
    box: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 6.2 6.8 1-4.9 4.8 1.2 6.8-6.1-3.2-6.1 3.2 1.2-6.8-4.9-4.8 6.8-1L12 2Z"/></svg>',
    truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17H5V5h10v12h-1"/><path d="M15 8h3l3 4v5h-3"/><circle cx="7" cy="17" r="2"/><circle cx="18" cy="17" r="2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></svg>'
  };
  return icons[name] || icons.star;
}

function renderPdpSnapshotItem(icon, label, value) {
  return '<div class="pdp-ref-snapshot-item">' +
    '<span class="pdp-ref-icon">' + getPdpIcon(icon) + '</span>' +
    '<small>' + escHtml(label) + '</small>' +
    '<strong>' + escHtml(value) + '</strong>' +
  '</div>';
}

function switchPdpInfoTab(tabName) {
  document.querySelectorAll('.pdp-info-tab').forEach(function(tab) {
    tab.classList.toggle('active', tab.getAttribute('data-pdp-tab') === tabName);
  });
  document.querySelectorAll('.pdp-info-panel').forEach(function(panel) {
    panel.classList.toggle('active', panel.getAttribute('data-pdp-panel') === tabName);
  });
}

function renderPdpRefMiniProduct(product, accent) {
  if (!product) return '';
  return '<article class="pdp-ref-mini-product">' +
    '<a href="' + getRouteUrl('product', product.id) + '" onclick="event.preventDefault();navigate(\'product\',\'' + product.id + '\')">' +
      '<img src="' + getProductImg(product) + '" alt="' + escHtml(product.name) + '" loading="lazy" />' +
      '<span>' + escHtml(product.name) + '</span>' +
      '<strong>KES ' + product.price.toLocaleString() + '</strong>' +
    '</a>' +
    '<button type="button" onclick="handleAddToCart(\'' + product.id + '\', this)" aria-label="Add ' + escHtml(product.name) + ' to cart">+</button>' +
  '</article>';
}

function getPdpRecommendationReason(item, source, profile) {
  if (!item || !source) return 'Another strong pick from the Majestic shelf.';
  if (item.cat === source.cat) return 'Same table mood with a fresh way to play.';
  if (sharedProductTagCount(item, source) > 0) return 'Matches the group, pace, and occasion you are browsing for.';
  if (profile && profile.bestFor && profile.bestFor.length) return 'A good next choice for ' + profile.bestFor[0].toLowerCase() + '.';
  if (item.price <= source.price) return 'A smart add-on that keeps the basket budget friendly.';
  return 'Pairs well when you want to build a fuller game night.';
}

function renderPdpLikeCard(item, source, profile, index) {
  var cat = CATEGORIES.find(function(c) { return c.id === item.cat; });
  var reason = getPdpRecommendationReason(item, source, profile);
  var badgeOptions = [
    { icon: '&#9734;', label: 'Family Favourite' },
    { icon: '&#128101;', label: 'Great for Groups' },
    { icon: '&#128293;', label: 'Trending Now' },
    { icon: '&#9825;', label: 'Classic Pick' }
  ];
  var badge = badgeOptions[index % badgeOptions.length];
  return '<article class="pdp-like-card' + (index === 2 ? ' pdp-like-featured' : '') + '">' +
    '<a href="' + getRouteUrl('product', item.id) + '" onclick="event.preventDefault();navigate(\'product\',\'' + item.id + '\')" aria-label="View ' + escHtml(item.name) + '">' +
      '<span class="pdp-like-match"><i>' + badge.icon + '</i>' + escHtml(badge.label) + '</span>' +
      '<span class="pdp-like-image"><img src="' + getProductImg(item) + '" alt="' + escHtml(item.name) + '" loading="lazy" /></span>' +
      '<span class="pdp-like-copy">' +
        '<small>' + escHtml(cat ? cat.label : 'Recommended') + '</small>' +
        '<b>' + escHtml(item.name) + '</b>' +
        '<em>' + escHtml(reason) + '</em>' +
      '</span>' +
      '<strong>KES ' + item.price.toLocaleString() + '</strong>' +
    '</a>' +
    '<button type="button" onclick="handleAddToCart(\'' + item.id + '\', this)" aria-label="Add ' + escHtml(item.name) + ' to cart">' + getPdpIcon('cart') + '</button>' +
  '</article>';
}

function updateProductMatchEngine() {
  var product = getProductById(currentProduct);
  if (!product) return;
  var playersEl = document.getElementById('pdp-match-players');
  var ageEl = document.getElementById('pdp-match-age');
  var budgetEl = document.getElementById('pdp-match-budget');
  var occasionEl = document.getElementById('pdp-match-occasion');
  var vibeEl = document.getElementById('pdp-match-vibe');
  var scoreEl = document.getElementById('pdp-match-score');
  var useEl = document.getElementById('pdp-match-use');
  var bundleEl = document.getElementById('pdp-match-bundle');
  var ctaEl = document.getElementById('pdp-match-wa');
  if (!scoreEl || !useEl || !bundleEl || !ctaEl) return;

  var cat = CATEGORIES.find(function(c) { return c.id === product.cat; });
  var facts = inferProductFacts(product, cat);
  var profile = getProductCommerceProfile(product, facts, cat);
  var players = playersEl ? playersEl.value : facts.players;
  var age = ageEl ? ageEl.value : facts.ageRange;
  var budget = budgetEl ? budgetEl.value : 'Open budget';
  var occasion = occasionEl ? occasionEl.value : facts.occasion;
  var vibe = vibeEl ? vibeEl.value : profile.vibe;
  var score = 76;
  var search = getProductSearchText(product).toLowerCase();
  if (players && facts.players.toLowerCase().indexOf(players.toLowerCase().split(' ')[0]) !== -1) score += 8;
  if (age && facts.ageRange.toLowerCase().indexOf(age.toLowerCase().replace(' years', '')) !== -1) score += 6;
  if (vibe && search.indexOf(vibe.toLowerCase().split(' ')[0]) !== -1) score += 6;
  if (product.price <= 3000 && /under|budget|1500|3000/i.test(budget)) score += 5;
  if (/gift|birthday/i.test(occasion + ' ' + search)) score += 5;
  score = Math.max(62, Math.min(98, score));
  var pairings = getRelatedProducts(product, 3).map(function(p) { return p.name; });
  if (!pairings.length) pairings = getAlsoBoughtProducts(product, 3).map(function(p) { return p.name; });
  scoreEl.textContent = score + '% match';
  useEl.textContent = 'Perfect for: ' + players + ' - ' + vibe + ' - ' + occasion;
  bundleEl.textContent = 'Tonight\'s Match: ' + [product.name].concat(pairings.slice(0, 2)).join(' + ');
  ctaEl.href = buildWhatsAppURL(buildProductBundleWhatsAppMessage(product, budget, players, occasion));
  var result = document.querySelector('.pdp-match-result');
  if (result) {
    result.classList.remove('is-updating');
    void result.offsetWidth;
    result.classList.add('is-updating');
  }
}

function getPdpComplementaryCategories(product) {
  var map = {
    'couples-games': ['party-games', 'card-games', 'drinking-games'],
    'drinking-games': ['party-games', 'card-games', 'couples-games'],
    'party-games': ['card-games', 'drinking-games', 'family-games'],
    'card-games': ['party-games', 'family-games', 'board-games'],
    'board-games': ['card-games', 'family-games', 'puzzles'],
    'family-games': ['card-games', 'board-games', 'kids-games'],
    'kids-games': ['family-games', 'puzzles', 'stem-toys'],
    'puzzles': ['board-games', 'family-games', 'stem-toys'],
    'stem-toys': ['puzzles', 'kids-games', 'lego-collectible'],
    'lego-collectible': ['stem-toys', 'puzzles', 'kids-games'],
    'dolls': ['infant-toys', 'musical-toys', 'kids-games'],
    'infant-toys': ['dolls', 'musical-toys', 'kids-games'],
    'musical-toys': ['infant-toys', 'dolls', 'kids-games']
  };
  return map[product.cat] || ['card-games', 'family-games', 'party-games'];
}

function productAudienceAllowed(candidate, source) {
  var sourceIsAdult = source.adult || source.safety === 'adult-only';
  var candidateIsAdult = candidate.adult || candidate.safety === 'adult-only';
  return sourceIsAdult || !candidateIsAdult;
}

function sharedProductTagCount(a, b) {
  var tagsA = a.tags || [];
  var tagsB = b.tags || [];
  return tagsA.filter(function(tag) { return tagsB.indexOf(tag) !== -1; }).length;
}

function getProductFamilyKey(product) {
  var text = (product.slug || product.name || '').toLowerCase();
  return text
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(board|card|cards|game|games|toy|toys|set|sets|classic|original|large|small|deluxe|premium|nairobi|kenya|adult|couples?|family|kids?)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNearDuplicateProduct(candidate, source) {
  if (!candidate || !source) return false;
  if (candidate.id === source.id || candidate.slug === source.slug) return true;
  var a = getProductFamilyKey(candidate);
  var b = getProductFamilyKey(source);
  if (!a || !b) return false;
  if (a === b) return true;
  if (Math.min(a.length, b.length) >= 10 && (a.indexOf(b) !== -1 || b.indexOf(a) !== -1)) return true;
  return false;
}

function uniquePdpRecommendations(items, source, limit) {
  var seen = {};
  var unique = [];
  items.forEach(function(item) {
    var key = getProductFamilyKey(item) || item.id;
    if (!key || seen[key] || isNearDuplicateProduct(item, source)) return;
    seen[key] = true;
    unique.push(item);
  });
  return unique.slice(0, limit || 4);
}

function getPdpPairingProducts(product, limit) {
  limit = limit || 4;
  var complementary = getPdpComplementaryCategories(product);
  var sourceText = getProductSearchText(product).toLowerCase();
  var occasionHints = /date|couple|adult|party|drink|family|gift|kids|strategy|puzzle/i;

  var candidates = PRODUCTS
    .filter(function(candidate) {
      return candidate.id !== product.id &&
        candidate.cat !== product.cat &&
        !isNearDuplicateProduct(candidate, product) &&
        productAudienceAllowed(candidate, product) &&
        complementary.indexOf(candidate.cat) !== -1;
    })
    .sort(function(a, b) {
      var scoreA = complementary.indexOf(a.cat) * -8 + sharedProductTagCount(a, product) * 3;
      var scoreB = complementary.indexOf(b.cat) * -8 + sharedProductTagCount(b, product) * 3;
      if (occasionHints.test(sourceText) && occasionHints.test(getProductSearchText(a))) scoreA += 2;
      if (occasionHints.test(sourceText) && occasionHints.test(getProductSearchText(b))) scoreB += 2;
      return scoreB - scoreA || a.price - b.price;
    });

  return uniquePdpRecommendations(candidates, product, limit);
}

function getPdpAlternativeProducts(product, excludedIds, limit) {
  limit = limit || 4;
  excludedIds = excludedIds || {};

  var alternatives = PRODUCTS
    .filter(function(candidate) {
      return candidate.id !== product.id &&
        !excludedIds[candidate.id] &&
        !isNearDuplicateProduct(candidate, product) &&
        productAudienceAllowed(candidate, product) &&
        candidate.cat === product.cat;
    })
    .sort(function(a, b) {
      return sharedProductTagCount(b, product) - sharedProductTagCount(a, product) ||
        Math.abs(product.price - a.price) - Math.abs(product.price - b.price);
    });

  if (alternatives.length < limit) {
    alternatives = alternatives.concat(PRODUCTS.filter(function(candidate) {
      return candidate.id !== product.id &&
        !excludedIds[candidate.id] &&
        alternatives.indexOf(candidate) === -1 &&
        !isNearDuplicateProduct(candidate, product) &&
        productAudienceAllowed(candidate, product) &&
        candidate.cat !== product.cat &&
        sharedProductTagCount(candidate, product) > 0;
    }));
  }

  return uniquePdpRecommendations(alternatives, product, limit);
}

function renderProductPage(productId) {
  var product = getProductById(productId);
  if (!product) { navigate('404'); return; }

  setHeaderLogoForPage('product');

  productDetailQty = 1;

  var cat = CATEGORIES.find(function(c) { return c.id === product.cat; });
  var facts = inferProductFacts(product, cat);
  var profile = getProductCommerceProfile(product, facts, cat);
  var metadataStatus = getProductMetadataStatus(product);
  var images = getProductImgAll(product);
  var mainImg = images[0];
  var preloadImg = document.getElementById('product-image-preload');
  if (!preloadImg) {
    preloadImg = document.createElement('link');
    preloadImg.id = 'product-image-preload';
    preloadImg.rel = 'preload';
    preloadImg.as = 'image';
    document.head.appendChild(preloadImg);
  }
  preloadImg.href = mainImg;
  var pairs = getPdpPairingProducts(product, 4);
  if (pairs.length < 3) pairs = getAlsoBoughtProducts(product, 8).filter(function(p) {
    return p.cat !== product.cat && productAudienceAllowed(p, product) && !isNearDuplicateProduct(p, product);
  });
  pairs = uniquePdpRecommendations(pairs, product, 4);
  var pairIds = pairs.reduce(function(ids, item) {
    ids[item.id] = true;
    return ids;
  }, {});
  var vibes = getPdpAlternativeProducts(product, pairIds, 4);
  if (vibes.length < 3) vibes = getRelatedProducts(product, 8).filter(function(p) {
    return !pairIds[p.id] && productAudienceAllowed(p, product) && !isNearDuplicateProduct(p, product);
  });
  vibes = uniquePdpRecommendations(vibes, product, 4);
  var bundleProducts = [product].concat(pairs.slice(0, 3));
  var stockText = product.stock !== undefined
    ? product.stock + ' units available'
    : (product.availability === 'Out of Stock' ? 'Out of stock' : 'Stock confirmation available');
  var productWaUrl = buildWhatsAppURL(buildProductWhatsAppMessage(product, productDetailQty || 1, 'premium product page'));
  var fitWaUrl = buildWhatsAppURL(buildProductFitWhatsAppMessage(product, facts));
  var bundleWaUrl = buildWhatsAppURL(buildProductBundleWhatsAppMessage(product, 'open budget', facts.players, facts.occasion));

  var catLink = document.getElementById('product-cat-breadcrumb-link');
  if (catLink) {
    catLink.textContent = cat ? cat.label : 'Shop';
    catLink.onclick = function() { navigate('category', product.cat); };
  }
  var nameEl = document.getElementById('product-breadcrumb-name');
  if (nameEl) nameEl.textContent = product.name;

  var thumbnails = images.map(function(src, i) {
    return '<button type="button" class="product-thumb' + (i === 0 ? ' active' : '') + '" onclick="switchProductImg(this,\'' + src + '\')" aria-label="Show ' + escHtml(product.name) + ' image ' + (i + 1) + '">' +
      '<img src="' + src + '" alt="' + escHtml(product.name) + ' view ' + (i + 1) + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '" />' +
    '</button>';
  }).join('');

  var refThumbs = images.slice(0, 4).map(function(src, i) {
    return '<button type="button" class="product-thumb' + (i === 0 ? ' active' : '') + '" onclick="switchProductImg(this,\'' + src + '\')" aria-label="Show ' + escHtml(product.name) + ' image ' + (i + 1) + '">' +
      '<img src="' + src + '" alt="' + escHtml(product.name) + ' view ' + (i + 1) + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '" />' +
    '</button>';
  }).join('') + (images.length > 4 ? '<button type="button" class="product-thumb pdp-ref-more-thumb" onclick="openImageZoomFromMain()"><strong>+' + (images.length - 4) + '</strong><span>More</span></button>' : '');

  var benefitCards = profile.benefits.map(function(item) {
    return '<article class="pdp-benefit-card"><span aria-hidden="true"></span><h3>' + escHtml(item[0]) + '</h3><p>' + escHtml(item[1]) + '</p></article>';
  }).join('');

  var bestForCards = profile.bestFor.map(function(item) {
    return '<span class="pdp-bestfor-chip">' + escHtml(item) + '</span>';
  }).join('');

  var playAttrs = [
    ['Players', facts.players],
    ['Age range', facts.ageRange],
    ['Play time', facts.playtime],
    ['Difficulty', profile.difficulty],
    ['Occasion', facts.occasion],
    ['Category', profile.category]
  ].map(function(item) {
    return '<div class="pdp-attribute"><span>' + escHtml(item[0]) + '</span><strong>' + escHtml(item[1]) + '</strong></div>';
  }).join('');

  var trustChips = ['Same-day Nairobi delivery', 'WhatsApp help', 'Kenya delivery', 'Stock confirmation available'].map(function(item) {
    return '<span class="pdp-trust-chip">' + escHtml(item) + '</span>';
  }).join('');

  var snapshotItems = [
    ['users', 'Players', facts.players],
    ['age', 'Age', facts.ageRange],
    ['clock', 'Play time', facts.playtime],
    ['sliders', 'Difficulty', profile.difficulty],
    ['box', 'Category', profile.category],
    ['star', 'Occasion', facts.occasion]
  ].map(function(item) {
    return renderPdpSnapshotItem(item[0], item[1], item[2]);
  }).join('');

  var loveCards = [
    ['shield', profile.benefits[0] ? profile.benefits[0][0] : 'Easy to learn', profile.benefits[0] ? profile.benefits[0][1] : 'Simple rules everyone can pick up in minutes.'],
    ['spark', profile.benefits[1] ? profile.benefits[1][0] : 'Strategic & engaging', profile.benefits[1] ? profile.benefits[1][1] : 'Think ahead, plan smart, and enjoy the table tension.'],
    ['users', profile.benefits[2] ? profile.benefits[2][0] : 'Perfect for any group', profile.benefits[2] ? profile.benefits[2][1] : 'Fun, competitive, and ideal for family or friends.']
  ].map(function(item) {
    return '<article class="pdp-ref-love-card"><span class="pdp-ref-love-icon">' + getPdpIcon(item[0]) + '</span><h3>' + escHtml(item[1]) + '</h3><p>' + escHtml(item[2]) + '</p></article>';
  }).join('');

  var matchCards = bundleProducts.slice(0, 3).map(function(item) {
    return '<article class="pdp-ref-match-card">' +
      '<img src="' + getProductImg(item) + '" alt="' + escHtml(item.name) + '" loading="lazy" />' +
      '<span>' + escHtml(item.name) + '</span>' +
    '</article>';
  }).join('<b class="pdp-ref-plus">+</b>');

  var howItPlaysImg = images[3] || images[2] || images[1] || mainImg;

  var relatedList = uniquePdpRecommendations(pairs.concat(vibes).concat(getRelatedProducts(product, 8)).concat(getAlsoBoughtProducts(product, 8)), product, 12);
  var relatedCards = relatedList.map(function(item, index) {
    return renderPdpLikeCard(item, product, profile, index);
  }).join('');

  var howItPlays = getProductHowToPlaySteps(product, facts, profile).map(function(step, index) {
    return '<li><span>' + (index + 1) + '</span>' + escHtml(step) + '</li>';
  }).join('');
  var howItPlaysPlain = getProductHowToPlaySteps(product, facts, profile);
  var aboutGameText = product.shortDescription || profile.subtitle || facts.benefitDescription || product.desc || product.description;
  var whyLoveEmojis = ['&#128578;', '&#128101;', '&#127873;'];
  var whyLoveItems = profile.benefits.slice(0, 3).map(function(item, index) {
    return '<li><span class="pdp-love-emoji">' + whyLoveEmojis[index] + '</span><div><strong>' + escHtml(item[0]) + '</strong><span>' + escHtml(item[1]) + '</span></div></li>';
  }).join('');
  var detailsItems = [
    ['users', 'Players', facts.players],
    ['age', 'Age', facts.ageRange],
    ['clock', 'Play time', facts.playtime],
    ['sliders', 'Difficulty', profile.difficulty],
    ['box', 'Category', profile.category],
    ['star', 'Occasion', facts.occasion],
    ['heart', 'Best for', profile.bestFor.join(', ')]
  ].map(function(item) {
    return '<li>' +
      '<span class="pdp-detail-icon">' + getPdpIcon(item[0]) + '</span>' +
      '<strong>' + escHtml(item[1]) + '</strong>' +
      '<span>' + escHtml(item[2]) + '</span>' +
    '</li>';
  }).join('');
  var howTabItems = howItPlaysPlain.map(function(step, index) {
    return '<li><span>' + (index + 1) + '</span>' + escHtml(step) + '</li>';
  }).join('');

  var content = document.getElementById('product-page-content');
  if (content) {
    content.innerHTML =
      '<section class="pdp-ref-hero pdp-full-span">' +
        '<div class="pdp-ref-gallery" aria-label="Product images">' +
          '<div class="product-thumbnails pdp-ref-thumbs" role="list" aria-label="Product image thumbnails">' + refThumbs + '</div>' +
          '<div class="pdp-ref-image-card product-main-img-wrap product-main-img-zoomable" data-gallery-swipe="true">' +
            '<button type="button" class="pdp-image-button" onclick="openImageZoomFromMain()" aria-label="Open larger image of ' + escHtml(product.name) + '">' +
              '<img id="product-main-img" class="product-main-img" src="' + mainImg + '" alt="' + escHtml(product.name) + ' product image" loading="eager" decoding="async" />' +
              '<span class="pdp-ref-zoom">' + getPdpIcon('search') + '</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<aside class="pdp-ref-buy product-detail-panel" aria-label="Product purchase options">' +
          '<div class="pdp-ref-badges"><span class="product-detail-cat">' + escHtml(cat ? cat.label : product.cat) + '</span><span class="stock-count">In Stock</span></div>' +
          '<h1 class="product-detail-title">' + escHtml(product.name) + '</h1>' +
          '<div class="pdp-ref-rating" aria-label="4.8 out of 5 stars"><span>★★★★<i>★</i></span><b>4.8 (128 reviews)</b></div>' +
          '<p class="pdp-subtitle">' + escHtml(profile.subtitle) + '</p>' +
          '<div class="product-detail-price">KES ' + product.price.toLocaleString() + '</div>' +
          '<div class="pdp-ref-actions product-purchase-block">' +
            '<div class="qty-stepper">' +
              '<button class="qty-stepper-btn" onclick="changeDetailQty(-1)" aria-label="Decrease quantity">-</button>' +
              '<span class="qty-stepper-val" id="detail-qty-val">1</span>' +
              '<button class="qty-stepper-btn" onclick="changeDetailQty(1)" aria-label="Increase quantity">+</button>' +
            '</div>' +
            '<button class="btn-coral product-primary-cta" onclick="addDetailToCart(\'' + product.id + '\')">' + getPdpIcon('cart') + 'Add to Cart</button>' +
          '</div>' +
          '<div class="pdp-ref-wa-row"><a id="product-wa-order-btn" href="' + productWaUrl + '" target="_blank" rel="noopener noreferrer" class="btn-wa product-secondary-cta">' + getPdpIcon('whatsapp') + 'Order on WhatsApp</a><button type="button" class="pdp-ref-wishlist' + (isWishlisted(product.id) ? ' active' : '') + '" data-wishlist-id="' + escHtml(product.id) + '" onclick="toggleWishlist(\'' + product.id + '\', this)" aria-pressed="' + (isWishlisted(product.id) ? 'true' : 'false') + '" aria-label="' + (isWishlisted(product.id) ? 'Remove from wishlist' : 'Save product') + '">' + getPdpIcon('heart') + '</button></div>' +
          '<div class="pdp-ref-service-row">' +
            '<span>' + getPdpIcon('truck') + '<b>Same-day</b><small>Nairobi delivery</small></span>' +
            '<span>' + getPdpIcon('whatsapp') + '<b>WhatsApp</b><small>support</small></span>' +
            '<span>' + getPdpIcon('lock') + '<b>Secure</b><small>payments</small></span>' +
            '<span>' + getPdpIcon('shield') + '<b>Easy returns</b><small>policy</small></span>' +
          '</div>' +
        '</aside>' +
      '</section>' +
      '<section class="pdp-info-layout pdp-info-layout-wide pdp-full-span">' +
        '<div class="pdp-info-card">' +
          '<div class="pdp-info-tabs" role="tablist" aria-label="Product information tabs">' +
            '<button type="button" class="pdp-info-tab active" data-pdp-tab="description" onclick="switchPdpInfoTab(\'description\')">Description</button>' +
            '<button type="button" class="pdp-info-tab" data-pdp-tab="how" onclick="switchPdpInfoTab(\'how\')">How to Play</button>' +
            '<button type="button" class="pdp-info-tab" data-pdp-tab="box" onclick="switchPdpInfoTab(\'box\')">What\'s in the Box</button>' +
            '<button type="button" class="pdp-info-tab" data-pdp-tab="details" onclick="switchPdpInfoTab(\'details\')">Details</button>' +
            '<button type="button" class="pdp-info-tab" data-pdp-tab="delivery" onclick="switchPdpInfoTab(\'delivery\')">Delivery & Returns</button>' +
            '<button type="button" class="pdp-info-tab" data-pdp-tab="faqs" onclick="switchPdpInfoTab(\'faqs\')">FAQs</button>' +
          '</div>' +
          '<div class="pdp-info-panel active" data-pdp-panel="description">' +
            '<div class="pdp-about-copy"><h2>About the Game</h2><p>' + escHtml(aboutGameText) + '</p><p>Gather around the table and enjoy a quick, memorable session built for shared laughs and easy gifting.</p><aside><b>&#10024;</b><span>Perfect for ' + escHtml(profile.category.toLowerCase()) + ', built for connection.</span></aside></div>' +
            '<div class="pdp-love-illustrated"><i class="pdp-love-spark s1">&#10024;</i><i class="pdp-love-spark s2">&#10024;</i><i class="pdp-love-spark s3">&#10022;</i><div><h2>Why you\'ll love it</h2><ul>' + whyLoveItems + '</ul></div><img src="/images/background images/pdp-family-table-illustration.png" alt="Friends playing games together" loading="lazy" /></div>' +
          '</div>' +
          '<div class="pdp-info-panel" data-pdp-panel="how"><div class="pdp-tab-how"><h2>How It Plays</h2><ol>' + howTabItems + '</ol><img src="' + howItPlaysImg + '" alt="" loading="lazy" /></div></div>' +
          '<div class="pdp-info-panel" data-pdp-panel="box"><h2>What\'s in the Box</h2><p>Package contents may vary by edition. Confirm exact contents on WhatsApp before ordering.</p></div>' +
          '<div class="pdp-info-panel" data-pdp-panel="details"><div class="pdp-detail-head"><span>Quick facts</span><h2>Details that help you pick the right table</h2></div><ul class="pdp-detail-list">' + detailsItems + '</ul></div>' +
          '<div class="pdp-info-panel" data-pdp-panel="delivery"><h2>Delivery & Returns</h2><ul><li>Same-day Nairobi delivery can be arranged after stock confirmation.</li><li>Kenya-wide delivery is available where courier coverage allows.</li><li>Confirm delivery fee, payment steps and exact edition on WhatsApp.</li></ul></div>' +
          '<div class="pdp-info-panel" data-pdp-panel="faqs"><h2>FAQs</h2><p>Ask Majestic Buddy for exact age fit, group size, delivery fee, and edition details before ordering.</p></div>' +
        '</div>' +
      '</section>' +
      '<section class="pdp-ref-likes pdp-full-span" aria-labelledby="pdp-likes-title"><div class="pdp-ref-likes-head"><h2 id="pdp-likes-title">You may also like <span>✦</span></h2><a href="#" onclick="navigate(\'shop\')">View all</a></div><div class="pdp-like-grid">' + relatedCards + '</div></section>' +
      '<section class="pdp-ref-bottom-trust pdp-full-span"><span>' + getPdpIcon('star') + '<b>Curated quality<br>games & toys</b></span><span>' + getPdpIcon('users') + '<b>Loved by families<br>across Kenya</b></span><span>' + getPdpIcon('lock') + '<b>Trusted & secure<br>shopping</b></span><span>' + getPdpIcon('heart') + '<b>Play more.<br>Connect more.</b></span></section>' +
      '<div class="pdp-mobile-action" role="region" aria-label="Mobile product actions"><span>KES ' + product.price.toLocaleString() + '</span><button onclick="addDetailToCart(\'' + product.id + '\')">Add</button><a href="' + productWaUrl + '" target="_blank" rel="noopener noreferrer">WhatsApp Order</a></div>';
    initProductGallerySwipe(images);
    updateWishlistButtons();
    updateProductMatchEngine();
    updateMajesticBuddyInsight('overall');
  }

  var relSection = document.getElementById('related-products-section');
  if (relSection) relSection.style.display = 'none';
  var alsoBoughtSection = document.getElementById('also-bought-section');
  if (alsoBoughtSection) alsoBoughtSection.style.display = 'none';
  setupMobileStickyCtaFooterGuard();
}
function setupMobileStickyCtaFooterGuard() {
  var footer = document.querySelector('.site-footer');
  if (!footer || !('IntersectionObserver' in window)) return;
  if (window.mobileStickyFooterObserver) window.mobileStickyFooterObserver.disconnect();

  window.mobileStickyFooterObserver = new IntersectionObserver(function(entries) {
    document.body.classList.toggle('product-footer-visible', entries[0].isIntersecting);
  }, { threshold: 0.02 });

  window.mobileStickyFooterObserver.observe(footer);
}

function switchProductImg(thumb, src) {
  document.querySelectorAll('.product-thumb').forEach(function(t) { t.classList.remove('active'); });
  if (thumb) thumb.classList.add('active');
  var mainImg = document.getElementById('product-main-img');
  if (mainImg) mainImg.src = src;
}

function initProductGallerySwipe(images) {
  var stage = document.querySelector('[data-gallery-swipe="true"]');
  if (!stage || !images || images.length < 2) return;
  var startX = 0;
  var startY = 0;
  stage.ontouchstart = function(e) {
    if (!e.touches || !e.touches.length) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  };
  stage.ontouchend = function(e) {
    if (!e.changedTouches || !e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - startX;
    var dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy)) return;
    var mainImg = document.getElementById('product-main-img');
    var currentSrc = mainImg ? mainImg.getAttribute('src') : images[0];
    var currentIndex = Math.max(0, images.indexOf(currentSrc));
    var nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0) nextIndex = images.length - 1;
    if (nextIndex >= images.length) nextIndex = 0;
    var thumbs = document.querySelectorAll('.product-thumb');
    switchProductImg(thumbs[nextIndex], images[nextIndex]);
  };
}

function applyImageZoomScale() {
  var img = document.getElementById('image-zoom-img');
  var stage = document.querySelector('.image-zoom-stage');
  if (!img) return;
  var zoomed = imageZoomScale > 1;
  img.style.transform = 'scale(' + imageZoomScale + ')';
  if (stage) stage.classList.toggle('is-zoomed', zoomed);
  img.classList.toggle('is-zoomed', imageZoomScale > 1);
}

function openImageZoom(src, alt) {
  var modal = document.getElementById('image-zoom-modal');
  var img = document.getElementById('image-zoom-img');
  var title = document.getElementById('image-zoom-title');
  if (!modal || !img) return;

  imageZoomScale = 1;
  img.src = src || '';
  img.alt = alt || 'Product image';
  if (title) title.textContent = alt || 'Product image';
  applyImageZoomScale();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function openImageZoomFromMain() {
  var img = document.getElementById('product-main-img');
  if (!img) return;
  openImageZoom(img.currentSrc || img.src, img.alt);
}

function closeImageZoom(event) {
  var modal = document.getElementById('image-zoom-modal');
  if (!modal) return;
  if (event && event.target !== modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  imageZoomScale = 1;
}

function changeImageZoom(delta) {
  imageZoomScale = Math.max(1, Math.min(3, imageZoomScale + delta));
  applyImageZoomScale();
}

function resetImageZoom() {
  imageZoomScale = 1;
  applyImageZoomScale();
}

function toggleImageZoomLevel() {
  imageZoomScale = imageZoomScale > 1 ? 1 : 2;
  applyImageZoomScale();
}

function changeDetailQty(delta) {
  productDetailQty = Math.max(1, productDetailQty + delta);
  var el = document.getElementById('detail-qty-val');
  if (el) el.textContent = productDetailQty;
  var product = getProductById(currentProduct);
  var waBtn = document.getElementById('product-wa-order-btn');
  if (product && waBtn) {
    waBtn.href = buildWhatsAppURL(buildProductWhatsAppMessage(product, productDetailQty, 'product page'));
  }
}

function addDetailToCart(productId) {
  var product = getProductById(productId);
  if (!product) return;
  for (var i = 0; i < productDetailQty; i++) addToCart(product);
  openCart();
}

/* ─────────────────────────────────────────────
   CART PAGE
───────────────────────────────────────────── */
function renderCartPage() {
  var content = document.getElementById('cart-page-content');
  if (!content) return;

  if (cart.length === 0) {
    content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🛒</div><h3 class="empty-state-title">Your cart is empty</h3><p class="empty-state-sub">Add some games to get started!</p><button class="btn-coral" onclick="navigate(\'shop\')">Browse Games</button></div>';
    return;
  }

  var itemsHtml = cart.map(function(item) {
    return '<div class="cart-item" style="background:white;border:2px solid #f3f4f6">' +
      '<div class="cart-item-img-wrap" style="width:80px;height:80px">' +
        '<img class="cart-item-img" src="' + item.img + '" alt="' + escHtml(item.name) + '" loading="lazy" />' +
      '</div>' +
      '<div class="cart-item-info">' +
        '<div class="cart-item-name" style="font-size:1rem">' + escHtml(item.name) + '</div>' +
        '<div class="cart-item-price">KES ' + item.price.toLocaleString() + ' each</div>' +
        '<div class="cart-item-controls">' +
          '<button class="qty-btn" onclick="updateQty(\'' + item.id + '\',-1);renderCartPage()">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
          '</button>' +
          '<span class="qty-display">' + item.qty + '</span>' +
          '<button class="qty-btn" onclick="updateQty(\'' + item.id + '\',1);renderCartPage()">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
          '</button>' +
          '<span style="margin-left:auto;font-weight:700;color:#111827">KES ' + (item.price * item.qty).toLocaleString() + '</span>' +
          '<button class="remove-item-btn" onclick="removeFromCart(\'' + item.id + '\');renderCartPage()">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  var total = getCartTotal();
  var waUrl = buildCartWhatsAppURL();

  content.innerHTML =
    '<div style="display:grid;grid-template-columns:1fr;gap:24px;max-width:800px;margin:0 auto">' +
      '<div>' +
        '<h2 style="font-family:\'Fredoka\',sans-serif;font-size:1.5rem;font-weight:700;margin-bottom:16px">Cart Items (' + cart.length + ')</h2>' +
        itemsHtml +
        '<button onclick="clearCart();renderCartPage()" style="background:none;border:none;color:#9ca3af;font-size:0.875rem;cursor:pointer;text-decoration:underline;margin-top:8px">Clear cart</button>' +
      '</div>' +
      '<div style="background:white;border-radius:16px;padding:24px;border:2px solid #f3f4f6;height:fit-content">' +
        '<h3 style="font-family:\'Fredoka\',sans-serif;font-size:1.25rem;font-weight:700;margin-bottom:16px">Order Summary</h3>' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.9rem;color:#6b7280">' +
          '<span>Subtotal (' + getCartCount() + ' items)</span>' +
          '<span style="font-weight:700;color:#111827">KES ' + total.toLocaleString() + '</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:0.9rem;color:#6b7280">' +
          '<span>Delivery</span>' +
          '<span style="color:#16a34a;font-weight:700">' + (total >= FREE_DELIVERY_THRESHOLD ? 'FREE' : 'KES 200–700') + '</span>' +
        '</div>' +
        '<div style="border-top:2px solid #f3f4f6;padding-top:16px;display:flex;justify-content:space-between;margin-bottom:20px">' +
          '<span style="font-weight:700;font-size:1rem">Total</span>' +
          '<span style="font-family:\'Fredoka\',sans-serif;font-size:1.5rem;font-weight:700;color:#e8521a">KES ' + total.toLocaleString() + '</span>' +
        '</div>' +
        '<a href="' + waUrl + '" target="_blank" rel="noopener noreferrer" class="btn-wa" onclick="openCheckoutDetailsModal(event)">' +
          '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>' +
          'Order via WhatsApp' +
        '</a>' +
        '<p style="font-size:0.75rem;color:#9ca3af;text-align:center;margin-top:12px">Delivery fee calculated on WhatsApp based on your location</p>' +
      '</div>' +
    '</div>';
}

/* ─────────────────────────────────────────────
   QUICK VIEW MODAL
───────────────────────────────────────────── */
var quickViewProduct = null;
var quickViewLastFocused = null;

function getQuickViewFocusable() {
  var modal = document.getElementById('quick-view-content');
  if (!modal) return [];
  return Array.prototype.slice.call(modal.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
    .filter(function(el) { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); });
}

function openQuickView(productId) {
  var product = getProductById(productId);
  if (!product) return;
  quickViewProduct = product;
  quickViewLastFocused = document.activeElement;

  var cat = CATEGORIES.find(function(c) { return c.id === product.cat; });

  document.getElementById('qv-title').textContent = product.name;
  document.getElementById('qv-img').src = getProductImg(product);
  document.getElementById('qv-img').alt = product.name;
  document.getElementById('qv-price').textContent = 'KES ' + product.price.toLocaleString();
  document.getElementById('qv-desc').textContent = product.shortDescription || 'A great game for everyone!';

  var badges = getProductBadgeMarkup(product, 'font-size:0.75rem;padding:4px 12px');
  document.getElementById('qv-badges').innerHTML = badges;

  var meta = '';
  if (cat) meta += '<span class="modal-meta-item">' + cat.icon + ' ' + cat.label + '</span>';
  if (product.players) meta += '<span class="modal-meta-item">👥 ' + product.players + '</span>';
  if (product.age) meta += '<span class="modal-meta-item">🎂 ' + product.age + '</span>';
  document.getElementById('qv-meta').innerHTML = meta;

  var waMsg = buildProductWhatsAppMessage(product, 1, 'quick view');
  document.getElementById('qv-wa-btn').href = buildWhatsAppURL(waMsg);

  var detailBtn = document.getElementById('qv-detail-btn');
  if (detailBtn) {
    detailBtn.href = getRouteUrl('product', productId);
    detailBtn.onclick = function() { closeQuickView(); navigate('product', productId); };
  }

  var modalBackdrop = document.getElementById('quick-view-modal');
  var modalContent = document.getElementById('quick-view-content');
  modalBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(function() {
    var focusable = getQuickViewFocusable();
    (focusable[0] || modalContent).focus();
  }, 0);
}

function closeQuickView(event) {
  if (event && event.target !== document.getElementById('quick-view-modal')) return;
  var modalBackdrop = document.getElementById('quick-view-modal');
  if (modalBackdrop) modalBackdrop.classList.remove('open');
  document.body.style.overflow = '';
  quickViewProduct = null;
  if (quickViewLastFocused && typeof quickViewLastFocused.focus === 'function') {
    quickViewLastFocused.focus();
  }
  quickViewLastFocused = null;
}

document.addEventListener('keydown', function(event) {
  var zoomModal = document.getElementById('image-zoom-modal');
  if (zoomModal && zoomModal.classList.contains('open') && event.key === 'Escape') {
    event.preventDefault();
    closeImageZoom();
    return;
  }

  var modalBackdrop = document.getElementById('quick-view-modal');
  if (!modalBackdrop || !modalBackdrop.classList.contains('open')) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closeQuickView();
    return;
  }

  if (event.key !== 'Tab') return;
  var focusable = getQuickViewFocusable();
  if (!focusable.length) return;
  var first = focusable[0];
  var last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

document.addEventListener('keydown', function(event) {
  var checkoutModal = document.getElementById('checkout-details-modal');
  if (checkoutModal && checkoutModal.classList.contains('open')) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeCheckoutDetailsModal();
      return;
    }
    if (event.key === 'Tab') trapFocusIn(checkoutModal, event);
    return;
  }

  var cartDrawer = document.getElementById('cart-drawer');
  if (cartDrawer && cartDrawer.classList.contains('open')) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeCart();
      return;
    }
    if (event.key === 'Tab') trapFocusIn(cartDrawer, event);
    return;
  }

  var mobileNav = document.getElementById('mobile-nav');
  if (mobileNav && mobileNav.classList.contains('open')) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMobileNav(true);
      return;
    }
    if (event.key === 'Tab') trapFocusIn(mobileNav, event);
  }
});

function getFocusableIn(container) {
  if (!container) return [];
  return Array.prototype.slice.call(container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
    .filter(function(el) { return el.offsetParent !== null || el === document.activeElement; });
}

function trapFocusIn(container, event) {
  var focusable = getFocusableIn(container);
  if (!focusable.length) {
    event.preventDefault();
    container.focus();
    return;
  }
  var first = focusable[0];
  var last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function quickViewAddToCart() {
  if (!quickViewProduct) return;
  addToCart(quickViewProduct);
  closeQuickView();
  openCart();
}

/* ─────────────────────────────────────────────
   HERO SLIDER
───────────────────────────────────────────── */
var heroSlides = [
  {
    bg: 'images/branding/game-night-banner-generated.webp',
    badge: 'Tabletop nights made easy',
    titleMain: 'Game Night',
    titleSub: 'Starts Here',
    desc: 'Board games, card games, dice, and puzzles for evenings full of laughter, friendly rivalry, and one more round.',
    feature: {
      id: 'catan',
      image: 'images/catan-board-game-nairobi.webp',
      label: 'Bestseller',
      title: 'Catan Board Game',
      copy: 'A modern classic for trading, strategy, and one-more-round energy.',
      price: 'KES 2,699'
    },
    ctas: [
      { label: 'Shop Bestsellers', color: '#ff4d2e', page: 'bestsellers' },
      { label: 'Browse All Games', color: 'rgba(255,255,255,0.14)', page: 'shop' }
    ]
  },
  {
    bg: 'images/branding/couples-banner.webp',
    badge: 'Cozy date-night games',
    titleMain: 'Play Closer',
    titleSub: 'Together',
    desc: 'Card games, conversation starters, and playful challenges for couples who want an easy night in.',
    feature: {
      id: 'the-ultimate-game-for-couples',
      image: 'images/the-ultimate-game-for-couples-game-nairobi.webp',
      label: 'Date night pick',
      title: 'Ultimate Game for Couples',
      copy: 'Light, fun prompts for connection, laughter, and better conversations.',
      price: 'KES 1,999'
    },
    ctas: [
      { label: 'Couples Games', color: '#e03b87', page: 'category', param: 'couples-games' },
      { label: 'Gift Picks', color: 'rgba(255,255,255,0.14)', page: 'gift-picks' }
    ]
  },
  {
    bg: 'images/branding/kids-banner.webp',
    badge: 'Bright screen-free play',
    titleMain: 'Kids Learn',
    titleSub: 'Through Play',
    desc: 'Colorful blocks, puzzles, board games, and toys that keep curious hands busy while learning feels natural.',
    feature: {
      id: 'beat-the-parents',
      image: 'images/beat-the-parents-kids-game-nairobi.webp',
      label: 'Family favorite',
      title: 'Beat the Parents',
      copy: 'Easy-to-teach family competition that gets everyone involved.',
      price: 'KES 2,499'
    },
    ctas: [
      { label: 'Kids Games', color: '#16a34a', page: 'category', param: 'kids-games' },
      { label: 'STEM Toys', color: 'rgba(255,255,255,0.14)', page: 'category', param: 'stem-toys' }
    ]
  },
  {
    bg: 'images/branding/gift-banner-generated.webp',
    badge: 'Gift-ready games and toys',
    titleMain: 'Find The',
    titleSub: 'Perfect Gift',
    desc: 'Wrapped surprises, family games, puzzles, and toys chosen for birthdays, holidays, rewards, and thoughtful moments.',
    feature: {
      id: 'azul',
      image: 'images/azul-board-game-nairobi.webp',
      label: 'Premium table pick',
      title: 'Azul Board Game',
      copy: 'Beautiful strategy, easy rules, and an elegant table presence.',
      price: 'KES 2,499'
    },
    ctas: [
      { label: 'View Gift Picks', color: '#d4a843', page: 'gift-picks' },
      { label: 'Ask For Help', color: 'rgba(255,255,255,0.14)', page: 'contact' }
    ]
  }
];

var currentHeroSlide = 0;
var heroTimer = null;

function initHero() {
  var section = document.getElementById('hero-section');
  if (!section) return;

  // Create slide backgrounds
  section.querySelectorAll('.hero-slide').forEach(function(slide) {
    slide.remove();
  });
  var firstHeroChild = section.firstChild;
  heroSlides.forEach(function(slide, i) {
    var slideEl = document.createElement('div');
    slideEl.className = 'hero-slide' + (i === 0 ? ' active' : '');
    slideEl.innerHTML = '<div class="hero-bg" style="background-image:url(\'' + slide.bg + '\')"></div><div class="hero-overlay"></div>';
    section.insertBefore(slideEl, firstHeroChild);
  });

  // Create dots
  var dotsEl = document.getElementById('hero-dots');
  if (dotsEl) {
    dotsEl.innerHTML = heroSlides.map(function(_, i) {
      return '<button class="hero-dot' + (i === 0 ? ' active' : '') + '" onclick="goToHeroSlide(' + i + ')" aria-label="Slide ' + (i+1) + '"></button>';
    }).join('');
  }

  updateHeroContent(0);
  startHeroTimer();
}

function updateHeroContent(idx) {
  var slide = heroSlides[idx];

  var badgeEl = document.getElementById('hero-badge');
  if (badgeEl) badgeEl.textContent = slide.badge;

  var titleMain = document.getElementById('hero-title-main');
  if (titleMain) titleMain.textContent = slide.titleMain;

  var titleSub = document.getElementById('hero-subtitle');
  if (titleSub) titleSub.textContent = slide.titleSub;

  var desc = document.getElementById('hero-desc');
  if (desc) desc.textContent = slide.desc;

  var ctas = document.getElementById('hero-ctas');
  if (ctas) {
    ctas.innerHTML = slide.ctas.map(function(cta) {
      var onclick = cta.param
        ? 'navigate(\'' + cta.page + '\',\'' + cta.param + '\')'
        : 'navigate(\'' + cta.page + '\')';
      return '<a href="#" class="hero-cta-btn" style="background:' + cta.color + '" onclick="' + onclick + '">' + cta.label + '</a>';
    }).join('');
  }

  var feature = slide.feature || {};
  var featureLink = document.getElementById('hero-feature-link');
  var featureImg = document.getElementById('hero-feature-img');
  var featureKicker = document.getElementById('hero-feature-kicker');
  var featureTitle = document.getElementById('hero-feature-title');
  var featureCopy = document.getElementById('hero-feature-copy');
  var featurePrice = document.getElementById('hero-feature-price');
  var featureBtn = document.getElementById('hero-feature-btn');
  if (featureLink) featureLink.onclick = function() { navigate('product', feature.id); return false; };
  if (featureImg) {
    featureImg.src = feature.image;
    featureImg.alt = feature.title || 'Featured game';
  }
  if (featureKicker) featureKicker.textContent = feature.label || '';
  if (featureTitle) featureTitle.textContent = feature.title || '';
  if (featureCopy) featureCopy.textContent = feature.copy || '';
  if (featurePrice) featurePrice.textContent = feature.price || '';
  if (featureBtn) featureBtn.onclick = function() { navigate('product', feature.id); };
}

function goToHeroSlide(idx) {
  var slides = document.querySelectorAll('.hero-slide');
  var dots = document.querySelectorAll('.hero-dot');

  slides.forEach(function(s, i) { s.classList.toggle('active', i === idx); });
  dots.forEach(function(d, i) { d.classList.toggle('active', i === idx); });

  currentHeroSlide = idx;
  updateHeroContent(idx);
}

function heroSlide(dir) {
  var next = (currentHeroSlide + dir + heroSlides.length) % heroSlides.length;
  goToHeroSlide(next);
  resetHeroTimer();
}

function startHeroTimer() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  heroTimer = setInterval(function() {
    heroSlide(1);
  }, 8000);
}

function resetHeroTimer() {
  clearInterval(heroTimer);
  startHeroTimer();
}

/* ─────────────────────────────────────────────
   GAME FINDER
───────────────────────────────────────────── */
var finderAnswers = {};
var finderStep = 0;

var categoryToTypes = {
  'board-games': ['strategy', 'party', 'family'],
  'card-games': ['strategy', 'party', 'fun'],
  'couples-games': ['romantic', 'intimate'],
  'family-games': ['family', 'fun'],
  'kids-games': ['educational', 'kids', 'family'],
  'party-games': ['party', 'fun'],
  'drinking-games': ['party', 'fun', 'adult'],
  'trivia-games': ['knowledge', 'fun'],
  'christian-games': ['faith', 'family'],
  'puzzles': ['puzzle', 'educational'],
  'lego-collectible': ['building', 'collectible'],
  'dolls': ['play', 'kids'],
  'infant-toys': ['baby', 'kids'],
  'musical-toys': ['music', 'fun'],
  'stem-toys': ['educational', 'science']
};

function initGameFinder() {
  finderAnswers = {};
  finderStep = 0;
  renderFinderStep();
}

function getFinderTypeOptions(audience, partyKind, adultConfirmed) {
  if (audience === 'kids') {
    return [
      { label: 'Learning / STEM', value: 'educational' },
      { label: 'Puzzle', value: 'puzzle' },
      { label: 'Active fun', value: 'active' },
      { label: 'Classic game', value: 'classic' }
    ];
  }
  if (audience === 'teens') {
    return [
      { label: 'Strategy', value: 'strategy' },
      { label: 'Puzzle', value: 'puzzle' },
      { label: 'Group fun', value: 'party' },
      { label: 'Classic game', value: 'classic' }
    ];
  }
  if (audience === 'family' || partyKind === 'family-party') {
    return [
      { label: 'Family night', value: 'family' },
      { label: 'Easy group play', value: 'party' },
      { label: 'Educational', value: 'educational' },
      { label: 'Puzzle / quiet play', value: 'puzzle' }
    ];
  }
  if (audience === 'couples' && adultConfirmed === 'yes') {
    return [
      { label: 'Romantic', value: 'romantic' },
      { label: 'Conversation', value: 'conversation' },
      { label: 'Strategy for two', value: 'strategy' },
      { label: 'Giftable date night', value: 'gift' }
    ];
  }
  if (audience === 'couples') {
    return [
      { label: 'Conversation', value: 'conversation' },
      { label: 'Strategy for two', value: 'strategy' },
      { label: 'Puzzle', value: 'puzzle' }
    ];
  }
  if (partyKind === 'adult-party' || audience === 'adults') {
    return [
      { label: 'Strategy', value: 'strategy' },
      { label: 'Party game', value: 'party' },
      { label: 'Conversation', value: 'conversation' },
      { label: 'Puzzle', value: 'puzzle' },
      { label: 'Drinking game', value: 'drinking' }
    ];
  }
  return [
    { label: 'Family-safe', value: 'family' },
    { label: 'Strategy', value: 'strategy' },
    { label: 'Puzzle', value: 'puzzle' },
    { label: 'Giftable classic', value: 'gift' }
  ];
}

function getFinderQuestions() {
  var questions = [{
    q: 'Who is this game for?',
    key: 'audience',
    options: [
      { label: 'Kids', value: 'kids' },
      { label: 'Teens', value: 'teens' },
      { label: 'Family', value: 'family' },
      { label: 'Adults', value: 'adults' },
      { label: 'Couples', value: 'couples' },
      { label: 'Party', value: 'party' },
      { label: 'Gift', value: 'gift' }
    ]
  }];

  if (!finderAnswers.audience) return questions;

  if (finderAnswers.audience === 'gift') {
    questions.push({
      q: 'Who will receive the gift?',
      key: 'giftAudience',
      options: [
        { label: 'Kids', value: 'kids' },
        { label: 'Teens', value: 'teens' },
        { label: 'Family', value: 'family' },
        { label: 'Adults', value: 'adults' },
        { label: 'Couples', value: 'couples' }
      ]
    });
  }

  var effectiveAudience = finderAnswers.giftAudience || finderAnswers.audience;

  if (effectiveAudience === 'couples') {
    questions.push({
      q: 'Are all players 18+?',
      key: 'adultConfirmed',
      options: [
        { label: 'Yes, everyone is 18+', value: 'yes' },
        { label: 'No / Not sure', value: 'no' }
      ]
    });
  }

  if (finderAnswers.audience === 'party') {
    questions.push({
      q: 'What kind of party is it?',
      key: 'partyKind',
      options: [
        { label: 'Family-friendly party', value: 'family-party' },
        { label: 'Adults-only party', value: 'adult-party' }
      ]
    });
    if (finderAnswers.partyKind === 'adult-party') {
      questions.push({
        q: 'Are all players 18+?',
        key: 'adultConfirmed',
        options: [
          { label: 'Yes, everyone is 18+', value: 'yes' },
          { label: 'No / Not sure', value: 'no' }
        ]
      });
    }
  }

  var typeOptions = getFinderTypeOptions(effectiveAudience, finderAnswers.partyKind, finderAnswers.adultConfirmed);
  if (typeOptions.length) {
    questions.push({ q: 'What should the game feel like?', key: 'type', options: typeOptions });
  }

  if (finderAnswers.type === 'drinking' && finderAnswers.adultConfirmed !== 'yes') {
    questions.push({
      q: 'Are all players 18+?',
      key: 'adultConfirmed',
      options: [
        { label: 'Yes, everyone is 18+', value: 'yes' },
        { label: 'No / Not sure', value: 'no' }
      ]
    });
  }

  questions.push({
    q: 'How many people will play?',
    key: 'players',
    options: [
      { label: '1 player', value: '1' },
      { label: '2 players', value: '2' },
      { label: '3-4 players', value: '3-4' },
      { label: '5+ players', value: '5+' }
    ]
  });

  return questions;
}

function getFinderOptionDetails(key, value, label) {
  var details = {
    audience: {
      kids: ['K', 'Safe, bright picks for younger players'],
      teens: ['T', 'Social, smart games with a bit more challenge'],
      family: ['F', 'Easy-to-teach picks for mixed ages'],
      adults: ['A', 'Strategy, party, and grown-up game nights'],
      couples: ['2', 'Two-player picks, with adult filters when needed'],
      party: ['P', 'Group games for birthdays and hangouts'],
      gift: ['G', 'Reliable presents by age, budget, and occasion']
    },
    giftAudience: {
      kids: ['K', 'Child-friendly gifting'],
      teens: ['T', 'Cooler picks for older kids'],
      family: ['F', 'Games a whole household can share'],
      adults: ['A', 'Gifts for grown-up players'],
      couples: ['2', 'Date-night and two-player gifts']
    },
    adultConfirmed: {
      yes: ['18+', 'Adult-only categories may be included'],
      no: ['Safe', 'Adult, drinking, and intimate picks stay hidden']
    },
    partyKind: {
      'family-party': ['All', 'Clean group games for mixed ages'],
      'adult-party': ['18+', 'Bolder party options with age confirmation']
    },
    type: {
      educational: ['STEM', 'Learning, problem solving, and discovery'],
      puzzle: ['Grid', 'Quiet focus and satisfying challenges'],
      active: ['Move', 'Energetic play for busy hands'],
      classic: ['Classic', 'Familiar games that are easy to recommend'],
      strategy: ['Think', 'Planning, tactics, and clever decisions'],
      party: ['Laugh', 'Fast group fun and easy icebreakers'],
      family: ['Table', 'Shared table play for mixed ages'],
      romantic: ['Date', 'Adults-only date-night energy'],
      conversation: ['Chat', 'Prompts, bonding, and light interaction'],
      gift: ['Gift', 'Polished, easy-to-give choices'],
      drinking: ['18+', 'Adults-only drinking game picks']
    },
    players: {
      '1': ['Solo', 'Puzzles, builds, and focused play'],
      '2': ['Duo', 'Best for pairs and head-to-head games'],
      '3-4': ['Small', 'A flexible small group setup'],
      '5+': ['Group', 'Bigger tables, teams, and party games']
    }
  };
  var item = details[key] && details[key][value];
  return {
    icon: item ? item[0] : label.charAt(0),
    hint: item ? item[1] : 'A good path for this recommendation'
  };
}

function getFinderAnswerLabel(key, value) {
  var questions = getFinderQuestions();
  for (var i = 0; i < questions.length; i++) {
    if (questions[i].key !== key) continue;
    for (var j = 0; j < questions[i].options.length; j++) {
      if (questions[i].options[j].value === value) return questions[i].options[j].label;
    }
  }
  return value;
}

function getFinderAnswerChips() {
  return Object.keys(finderAnswers).map(function(key) {
    return '<span class="finder-answer-chip">' + escHtml(getFinderAnswerLabel(key, finderAnswers[key])) + '</span>';
  }).join('');
}

function getFinderScoredMatches(answers) {
  return PRODUCTS.map(function(p) {
    var meta = inferProductMeta(p);
    if (!isProductAllowedForAnswers(p, answers, meta)) return null;
    var result = getProductScore(p, answers, meta);
    return { product: p, score: result.score, reasons: result.reasons, meta: meta };
  }).filter(Boolean);
}

function getFinderLiveMatchCount() {
  if (!Object.keys(finderAnswers).length) return PRODUCTS.filter(function(p) { return !p.adult; }).length;
  return getFinderScoredMatches(finderAnswers).filter(function(item) { return item.score > 0; }).length;
}

function finderQuickAdd(id, event, btn) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  handleAddToCart(id, btn);
}

function getFinderAudienceIconHtml(value) {
  var icons = {
    kids: '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="finderIconKids" x1="10" y1="9" x2="54" y2="56" gradientUnits="userSpaceOnUse"><stop stop-color="#fff4a8"/><stop offset=".52" stop-color="#ff8eb5"/><stop offset="1" stop-color="#9587ff"/></linearGradient></defs><path d="M39 28c0 10-7.5 18-17 18S5 38 5 28 12.5 10 22 10s17 8 17 18Z" fill="url(#finderIconKids)" stroke="#071126" stroke-width="3"/><path d="M15 27c1-2 3-2 4 0M26 27c1-2 3-2 4 0M17 35c4 4 10 4 14 0" fill="none" stroke="#071126" stroke-width="3" stroke-linecap="round"/><path d="M39 32h12v24H39zM28 40h11v16H28zM51 43h8v13h-8z" fill="#ffe28a" stroke="#071126" stroke-width="3"/><path d="M31 53h25" stroke="#8d82ff" stroke-width="5" stroke-linecap="round"/></svg>',
    teens: '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="finderIconTeens" x1="8" y1="12" x2="57" y2="55" gradientUnits="userSpaceOnUse"><stop stop-color="#fff7b8"/><stop offset=".55" stop-color="#f4a4c7"/><stop offset="1" stop-color="#9c8cff"/></linearGradient></defs><path d="M8 36c0-14 10-24 23-24s23 10 23 24" fill="#fffbe9" stroke="#071126" stroke-width="3"/><path d="M9 34h8v18H9zM47 34h8v18h-8z" fill="url(#finderIconTeens)" stroke="#071126" stroke-width="3"/><path d="M54 20h5v34H41V20h13Z" fill="url(#finderIconTeens)" stroke="#071126" stroke-width="3" stroke-linejoin="round"/><path d="M46 26h8M49 49h2" stroke="#071126" stroke-width="3" stroke-linecap="round"/></svg>',
    family: '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="finderIconFamily" x1="8" y1="9" x2="58" y2="56" gradientUnits="userSpaceOnUse"><stop stop-color="#fff3a5"/><stop offset=".56" stop-color="#ff9db7"/><stop offset="1" stop-color="#8c84ff"/></linearGradient></defs><path d="M11 55V31c0-7 4-12 10-12s10 5 10 12v24M33 55V33c0-6 4-10 9-10s9 4 9 10v22" fill="url(#finderIconFamily)" stroke="#071126" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="21" cy="12" r="7" fill="#fff7c8" stroke="#071126" stroke-width="3"/><circle cx="42" cy="16" r="6" fill="#ffd8a6" stroke="#071126" stroke-width="3"/><path d="M42 38l11-10 9 8v19H42Z" fill="#ffb985" stroke="#071126" stroke-width="3" stroke-linejoin="round"/></svg>',
    adults: '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="finderIconAdults" x1="12" y1="10" x2="52" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="#fff0a6"/><stop offset=".58" stop-color="#f5a3c1"/><stop offset="1" stop-color="#9388ff"/></linearGradient></defs><circle cx="32" cy="16" r="10" fill="#ffe4ab" stroke="#071126" stroke-width="3"/><path d="M13 57V45c0-12 8-20 19-20s19 8 19 20v12" fill="url(#finderIconAdults)" stroke="#071126" stroke-width="3" stroke-linejoin="round"/><path d="M25 28l7 10 7-10M28 56l3-15h2l3 15M22 31l10 10 10-10" fill="none" stroke="#071126" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    couples: '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="finderIconCouples" x1="7" y1="10" x2="58" y2="55" gradientUnits="userSpaceOnUse"><stop stop-color="#fff7b6"/><stop offset=".55" stop-color="#ff91b5"/><stop offset="1" stop-color="#9a8cff"/></linearGradient></defs><path d="M30 22c-5-11-22-7-22 7 0 11 15 20 22 25 7-5 22-14 22-25 0-14-17-18-22-7Z" fill="url(#finderIconCouples)" stroke="#071126" stroke-width="3" stroke-linejoin="round"/><path d="M30 22c5-10 20-6 20 6" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M40 43h18M43 52h13M48 32h8v11h-8zM42 34c2-3 2-5 0-8M51 27c2-3 2-5 0-8" fill="none" stroke="#071126" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    party: '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="finderIconParty" x1="9" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse"><stop stop-color="#fff1a3"/><stop offset=".55" stop-color="#ff9ab9"/><stop offset="1" stop-color="#9588ff"/></linearGradient></defs><path d="M9 19c8 8 15 8 23 0M18 10l7 7M35 12l-5 8M48 8l5 5M12 34c7 0 12 5 12 12v9H0v-9c0-7 5-12 12-12Z" fill="url(#finderIconParty)" stroke="#071126" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="27" r="6" fill="#ffdca2" stroke="#071126" stroke-width="3"/><path d="M34 32c8 0 14 6 14 14v9H20v-9c0-8 6-14 14-14Z" fill="url(#finderIconParty)" stroke="#071126" stroke-width="3"/><circle cx="34" cy="24" r="7" fill="#d8c0ff" stroke="#071126" stroke-width="3"/><path d="M51 36c6 1 10 6 10 12v7H46" fill="url(#finderIconParty)" stroke="#071126" stroke-width="3"/><circle cx="51" cy="29" r="6" fill="#ffdca2" stroke="#071126" stroke-width="3"/></svg>',
    gift: '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="finderIconGift" x1="10" y1="10" x2="54" y2="57" gradientUnits="userSpaceOnUse"><stop stop-color="#fff3a6"/><stop offset=".55" stop-color="#ff9cba"/><stop offset="1" stop-color="#9188ff"/></linearGradient></defs><path d="M10 28h44v28H10zM7 20h50v10H7z" fill="url(#finderIconGift)" stroke="#071126" stroke-width="3" stroke-linejoin="round"/><path d="M32 20v36M10 33h44" stroke="#071126" stroke-width="3"/><path d="M32 20c-10-12-22-2-11 6M32 20c10-12 22-2 11 6" fill="none" stroke="#071126" stroke-width="3" stroke-linecap="round"/><path d="M55 8l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="#ffd66c"/></svg>'
  };
  return icons[value] || '<span>' + escHtml(value.charAt(0).toUpperCase()) + '</span>';
}

function renderFinderStep() {
  var container = document.getElementById('finder-container');
  if (!container) return;

  var finderQuestions = getFinderQuestions();
  if (finderStep >= finderQuestions.length) {
    renderFinderResults();
    return;
  }

  var q = finderQuestions[finderStep];
  var total = finderQuestions.length;
  var percent = Math.round((finderStep / Math.max(total, 1)) * 100);
  var answerChips = getFinderAnswerChips();
  var liveMatches = getFinderLiveMatchCount();
  var isAudienceStep = q.key === 'audience' && finderStep === 0;

  if (isAudienceStep) {
    container.innerHTML =
      '<div class="finder-card finder-wizard-card finder-audience-stage">' +
        '<h3 class="finder-question">' + escHtml(q.q) + '</h3>' +
        '<div class="finder-options finder-wizard-options finder-audience-options">' +
          q.options.map(function(opt) {
            return '<button type="button" class="finder-option finder-wizard-option finder-audience-option" onclick="finderAnswer(\'' + opt.value + '\')" aria-label="' + escHtml(opt.label) + '">' +
              '<span class="finder-option-icon">' + getFinderAudienceIconHtml(opt.value) + '</span>' +
              '<span class="finder-option-copy"><span class="finder-option-label">' + escHtml(opt.label) + '</span></span>' +
            '</button>';
          }).join('') +
        '</div>' +
      '</div>';
    return;
  }

  container.innerHTML =
    '<div class="finder-card finder-wizard-card">' +
      '<div class="finder-shell-head">' +
        '<div><span class="finder-kicker">Question ' + (finderStep + 1) + ' of ' + total + '</span><h3 class="finder-question">' + escHtml(q.q) + '</h3></div>' +
        '<div class="finder-score-dial"><strong>' + percent + '%</strong><span>complete</span></div>' +
      '</div>' +
      '<div class="finder-progress finder-progress-track"><span style="width:' + percent + '%"></span></div>' +
      '<div class="finder-live-count" aria-live="polite"><strong>' + liveMatches + '</strong><span>safe matches currently fit your answers</span></div>' +
      (answerChips ? '<div class="finder-answer-tray">' + answerChips + '</div>' : '<div class="finder-answer-tray"><span class="finder-answer-chip">Start with who will play</span></div>') +
      '<div class="finder-options finder-wizard-options">' +
        q.options.map(function(opt) {
          var detail = getFinderOptionDetails(q.key, opt.value, opt.label);
          return '<button class="finder-option finder-wizard-option" onclick="finderAnswer(\'' + opt.value + '\')">' +
            '<span class="finder-option-icon">' + escHtml(detail.icon) + '</span>' +
            '<span class="finder-option-copy"><span class="finder-option-label">' + escHtml(opt.label) + '</span><span class="finder-option-hint">' + escHtml(detail.hint) + '</span></span>' +
          '</button>';
        }).join('') +
      '</div>' +
      '<div class="finder-nav-row">' +
        (finderStep > 0 ? '<button class="finder-nav-btn" onclick="finderBack()">Back</button>' : '<span></span>') +
        '<button class="finder-reset-btn finder-reset-inline" onclick="initGameFinder()">Reset wizard</button>' +
      '</div>' +
    '</div>';
}

function finderAnswer(answer) {
  var finderQuestions = getFinderQuestions();
  var key = finderQuestions[finderStep].key;
  finderAnswers[key] = answer;
  finderStep++;

  localStorage.setItem('gamePreferences', JSON.stringify(finderAnswers));

  renderFinderStep();
}

function finderBack() {
  if (finderStep <= 0) return;
  var finderQuestions = getFinderQuestions();
  var currentKey = finderQuestions[finderStep] && finderQuestions[finderStep].key;
  if (currentKey && finderAnswers[currentKey]) delete finderAnswers[currentKey];
  finderStep--;
  var previousQuestions = getFinderQuestions();
  var previousKey = previousQuestions[finderStep] && previousQuestions[finderStep].key;
  if (previousKey && finderAnswers[previousKey]) delete finderAnswers[previousKey];
  renderFinderStep();
}

function getProductScoreLegacy(product, answers) {
  var score = 0;
  var reasons = [];

  var productTypes = categoryToTypes[product.cat] || [];

  if (productTypes.includes(answers.type) || (answers.type === 'party' && (product.cat === 'party-games' || product.cat === 'card-games'))) {
    score += 4;
    reasons.push('matches your game style');
  }

  if (answers.type === 'educational' && (product.cat === 'kids-games' || product.cat === 'puzzles' || product.cat === 'stem-toys')) {
    score += 4;
    reasons.push('educational');
  }

  if (answers.type === 'romantic' && product.cat === 'couples-games') {
    score += 4;
    reasons.push('perfect for couples');
  }

  var productAge = product.age || ageToGroup[answers.age] || 'adults';
  var answerAge = answers.age;

  if (answerAge === 'all' || productAge === 'all') {
    score += 2;
    reasons.push('any age');
  } else if (productAge === answerAge) {
    score += 3;
    reasons.push('perfect for your age group');
  } else if (productAge === 'all') {
    score += 2;
  }

  var productPlayers = product.players;
  var minP = productPlayers ? (typeof productPlayers === 'string' ? parseInt(productPlayers.split('-')[0]) : (Array.isArray(productPlayers) ? productPlayers[0] : 2)) : 2;
  var maxP = productPlayers ? (typeof productPlayers === 'string' ? parseInt(productPlayers.split('-')[1] || productPlayers.split('-')[0]) : (Array.isArray(productPlayers) ? productPlayers[1] : 4)) : 4;
  var answerPlayers = answers.players;

  if (answerPlayers === 5) {
    if (maxP >= 5) {
      score += 3;
      reasons.push('works with 5+ players');
    }
  } else if (answerPlayers >= minP && answerPlayers <= maxP) {
    score += 3;
    reasons.push('ideal for your group size');
  } else if (minP <= answerPlayers) {
    score += 1;
  }

  if (product.difficulty === answers.difficulty) {
    score += 2;
    reasons.push(answers.difficulty + ' difficulty');
  }

  if (product.badge === 'BESTSELLER' || product.badge === 'POPULAR') {
    score += 1;
    reasons.push('bestseller');
  }

  return { score: score, reasons: reasons };
}

function generateReasonLegacy(reasons) {
  if (!reasons || reasons.length === 0) return '';
  return reasons.slice(0, 2).join(' • ');
}

function renderFinderResultsLegacy() {
  var container = document.getElementById('finder-container');
  if (!container) return;

  var answers = finderAnswers;
  var scored = PRODUCTS.map(function(p) {
    var result = getProductScoreLegacy(p, answers);
    return { product: p, score: result.score, reasons: result.reasons };
  });

  var results = scored
    .filter(function(item) { return item.score > 0; })
    .sort(function(a, b) { return b.score - a.score; })
    .slice(0, 6);

  if (answers.age === 'kids' || answers.age === 'teens') {
    results = results.filter(function(r) { return !r.product.adult; });
    if (results.length < 3) {
      var fallback = getBestsellers().slice(0, 3);
      results = results.concat(fallback.filter(function(f) {
        return !results.some(function(r) { return r.product.id === f.id; });
      }));
    }
  }

  if (results.length === 0) {
    results = getBestsellers().slice(0, 6).map(function(p) {
      return { product: p, score: 5, reasons: ['customer favorite'] };
    });
  }

  container.innerHTML =
    '<div class="finder-card">' +
      '<h3 class="finder-results-title">🎯 Your Perfect Matches!</h3>' +
      '<p style="color:#9ca3af;font-size:0.875rem;text-align:center;margin-bottom:16px">Based on your answers, these are the safest and closest matches.</p>' +
      '<button class="finder-reset-btn" onclick="initGameFinder()">← Start Over</button>' +
      '<div class="finder-results-grid">' +
        results.map(function(r) {
          var p = r.product;
          var reasonText = r.reasons && r.reasons.length > 0 ? r.reasons.slice(0, 2).join(' • ') : 'recommended for you';
          return '<div onclick="navigate(\'product\',\'' + p.id + '\')" style="cursor:pointer;background:rgba(255,255,255,0.1);border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.15);transition:transform 0.2s ease" onmouseover="this.style.transform=\'scale(1.03)\'" onmouseout="this.style.transform=\'\'">' +
            '<img src="' + getProductImg(p) + '" alt="' + escHtml(p.name) + '" loading="lazy" style="width:100%;aspect-ratio:1;object-fit:cover" />' +
            '<div style="padding:8px">' +
              '<p style="font-size:0.75rem;font-weight:700;color:white;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escHtml(p.name) + '</p>' +
              '<p style="font-size:0.65rem;color:#2ebfb0;margin-bottom:2px">' + reasonText + '</p>' +
              '<p style="font-size:0.7rem;color:#d4a843;font-weight:700">KES ' + p.price.toLocaleString() + '</p>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
}

/* ─────────────────────────────────────────────
    HEADER NAV — SHOP DROPDOWN
───────────────────────────────────────────── */
function getProductSearchText(product) {
  return [product.name, product.desc, product.cat, product.sub, product.slug, (product.seoKeywords || []).join(' ')].filter(Boolean).join(' ').toLowerCase();
}

function hasAnyTerm(text, terms) {
  return terms.some(function(term) { return text.indexOf(term) !== -1; });
}

function inferPlayerRange(product, text) {
  var source = text || getProductSearchText(product);
  var rangeMatch = source.match(/(\d+)\s*(?:-|–|â€“|to)\s*(\d+)\s*players?/i);
  if (rangeMatch) return { min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10), label: rangeMatch[1] + '-' + rangeMatch[2] + ' players' };
  var upToMatch = source.match(/up to\s*(\d+)\s*players?/i);
  if (upToMatch) return { min: 2, max: parseInt(upToMatch[1], 10), label: 'Up to ' + upToMatch[1] + ' players' };
  var singleMatch = source.match(/for\s*(\d+)\s*players?/i);
  if (singleMatch) {
    var players = parseInt(singleMatch[1], 10);
    return { min: players, max: players, label: players + ' players' };
  }
  if (product.cat === 'couples-games') return { min: 2, max: 2, label: '2 players' };
  if (product.cat === 'party-games' || product.cat === 'drinking-games') return { min: 3, max: 10, label: 'Group play' };
  if (product.cat === 'puzzles' || product.cat === 'stem-toys' || product.cat === 'dolls' || product.cat === 'infant-toys') return { min: 1, max: 2, label: '1-2 players' };
  return { min: 2, max: 4, label: '2-4 players' };
}

function inferProductMeta(product) {
  var text = getProductSearchText(product);
  var cat = product.cat || '';
  var isRomanticOrIntimate = cat === 'couples-games' || hasAnyTerm(text, ['couples', 'couple', 'romantic', 'intimate', 'intimacy', 'date night', 'flirt', 'sex', 'naughty', 'bedroom', 'bondage', 'desire', 'x rated', 'x-rated', 'his and hers']);
  var isDrinking = cat === 'drinking-games' || hasAnyTerm(text, ['drinking', 'drink', 'drunk', 'beer pong', 'buzzed', 'sotally', 'truth or drink', 'do or drink', 'black out', 'bottle']);
  var isAdultOnly = product.adult === true || isDrinking || hasAnyTerm(text, ['18+', 'adult', 'adults only', 'nsfw', 'after dark', 'x-rated', 'x rated', 'sex', 'naughty', 'dirty', 'explicit', 'disturbed', 'drinking', 'drink', 'drunk']);
  var isEducational = cat === 'stem-toys' || hasAnyTerm(text, ['educational', 'learning', 'stem', 'science', 'math', 'spelling', 'junior', 'kids', 'memory', 'alphabet', 'school']);
  var isPuzzle = cat === 'puzzles' || hasAnyTerm(text, ['puzzle', 'jigsaw', 'tangram', 'ubongo', 'tetris']);
  var isStrategy = hasAnyTerm(text, ['strategy', 'chess', 'catan', 'azul', 'risk', 'sequence', 'monopoly', 'scrabble', 'rummikub', 'qwirkle', 'backgammon', 'mancala']) || product.sub === 'strategy';
  var audience = [];
  if (cat === 'kids-games' || cat === 'stem-toys' || cat === 'infant-toys' || cat === 'dolls' || hasAnyTerm(text, ['kids', 'junior', 'children', 'child', 'baby', 'infant', 'paw patrol', 'frozen', 'barbie', 'lol surprise'])) audience.push('kids');
  if (hasAnyTerm(text, ['teens', 'teen', 'marvel', 'bts']) || (!isAdultOnly && (isStrategy || isPuzzle || cat === 'card-games' || cat === 'board-games'))) audience.push('teens');
  if (cat === 'family-games' || hasAnyTerm(text, ['family', 'families', 'all ages', 'whole family', 'parents']) || (!isAdultOnly && ['board-games', 'card-games', 'trivia-games', 'puzzles', 'christian-games'].indexOf(cat) !== -1)) audience.push('family');
  if (cat === 'party-games' || cat === 'drinking-games' || hasAnyTerm(text, ['party', 'charades', 'bingo', 'meme', 'friends', 'group', 'ice breaker', 'icebreaker'])) audience.push('party');
  if (cat === 'couples-games' || isRomanticOrIntimate) audience.push('couples');
  if (!isAdultOnly) audience.push('all-ages');
  if (isAdultOnly || cat === 'party-games' || cat === 'drinking-games' || cat === 'couples-games') audience.push('adults');
  audience = audience.filter(function(value, index, arr) { return arr.indexOf(value) === index; });
  return {
    ageGroup: isAdultOnly ? 'adults' : (audience.indexOf('kids') !== -1 ? 'kids' : (audience.indexOf('teens') !== -1 ? 'teens' : 'all')),
    audience: audience,
    isAdultOnly: isAdultOnly,
    isRomanticOrIntimate: isRomanticOrIntimate,
    isDrinking: isDrinking,
    isEducational: isEducational,
    isPuzzle: isPuzzle,
    isStrategy: isStrategy,
    isFamilySafe: !isAdultOnly && !isRomanticOrIntimate && !isDrinking,
    players: inferPlayerRange(product, text)
  };
}

function getEffectiveFinderAudience(answers) {
  if (answers.giftAudience) return answers.giftAudience;
  if (answers.partyKind === 'family-party') return 'family';
  if (answers.partyKind === 'adult-party') return 'adults';
  return answers.audience || 'family';
}

function isProductAllowedForAnswers(product, answers, meta) {
  var audience = getEffectiveFinderAudience(answers);
  var safeAudience = audience === 'kids' || audience === 'teens' || audience === 'family' || audience === 'all';
  if (safeAudience && (meta.isAdultOnly || meta.isDrinking || meta.isRomanticOrIntimate || product.cat === 'couples-games' || product.cat === 'drinking-games')) return false;
  if (audience === 'kids' && meta.audience.indexOf('kids') === -1 && !meta.isEducational && !meta.isPuzzle && product.cat !== 'kids-games' && product.cat !== 'stem-toys') return false;
  if (audience === 'teens' && meta.audience.indexOf('teens') === -1 && meta.audience.indexOf('family') === -1 && meta.audience.indexOf('all-ages') === -1) return false;
  if (audience === 'family' && !meta.isFamilySafe) return false;
  if ((answers.audience === 'couples' || audience === 'couples' || answers.type === 'romantic') && answers.adultConfirmed !== 'yes') return !meta.isAdultOnly && !meta.isRomanticOrIntimate && product.cat !== 'couples-games';
  if ((answers.type === 'drinking' || meta.isDrinking) && answers.adultConfirmed !== 'yes') return false;
  if (answers.type === 'romantic' && (answers.adultConfirmed !== 'yes' || product.cat !== 'couples-games')) return false;
  if (answers.type === 'drinking' && product.cat !== 'drinking-games' && !meta.isDrinking) return false;
  return true;
}

function playerChoiceFits(choice, players) {
  if (!choice) return true;
  if (choice === '1') return players.min <= 1 && players.max >= 1;
  if (choice === '2') return players.min <= 2 && players.max >= 2;
  if (choice === '3-4') return players.max >= 3 && players.min <= 4;
  if (choice === '5+') return players.max >= 5;
  return true;
}

function getProductScore(product, answers, meta) {
  var score = 0;
  var reasons = [];
  var productTypes = categoryToTypes[product.cat] || [];
  var audience = getEffectiveFinderAudience(answers);
  if (meta.audience.indexOf(audience) !== -1 || (audience === 'adults' && meta.audience.indexOf('adults') !== -1)) score += 5;
  if (answers.audience === 'gift' && product.badge === 'GIFT PICKS') { score += 2; reasons.push('Gift-ready'); }
  if (productTypes.includes(answers.type) || (answers.type === 'party' && (product.cat === 'party-games' || product.cat === 'card-games' || meta.audience.indexOf('party') !== -1))) { score += 4; reasons.push('Matches your game style'); }
  if (answers.type === 'educational' && meta.isEducational) { score += 4; reasons.push('Educational'); }
  if (answers.type === 'romantic' && meta.isRomanticOrIntimate) { score += 4; reasons.push('Romantic'); }
  if (answers.type === 'puzzle' && meta.isPuzzle) { score += 4; reasons.push('Puzzle pick'); }
  if (answers.type === 'strategy' && meta.isStrategy) { score += 4; reasons.push('Strategy'); }
  if (answers.type === 'drinking' && meta.isDrinking) { score += 4; reasons.push('Adults-only party'); }
  if (playerChoiceFits(answers.players, meta.players)) { score += 3; reasons.push(meta.players.label); }
  if (product.badge === 'BESTSELLER' || product.badge === 'POPULAR') { score += 1; reasons.push('Popular pick'); }
  return { score: score, reasons: reasons };
}

function getFinderReason(product, answers, meta, reasons) {
  var audience = getEffectiveFinderAudience(answers);
  var parts = [];
  if (audience === 'kids') parts.push('Safe kids pick');
  else if (audience === 'family') parts.push('Best for family night');
  else if (answers.type === 'romantic' || product.cat === 'couples-games') parts.push('Adults-only couples pick');
  else if (answers.type === 'drinking') parts.push('Adults-only party pick');
  else if (answers.audience === 'party') parts.push('Party pick');
  else if (audience === 'teens') parts.push('Teen-friendly pick');
  else parts.push('Closest match');
  if (meta.isEducational) parts.push('Educational');
  if (meta.isPuzzle && parts.length < 3) parts.push('Puzzle');
  if (meta.isStrategy && parts.length < 3) parts.push('Strategy');
  if (meta.isFamilySafe && parts.length < 3) parts.push('Family-friendly');
  if (meta.isRomanticOrIntimate && parts.length < 3) parts.push('Romantic');
  if (meta.players && parts.length < 3) parts.push(meta.players.label);
  (reasons || []).forEach(function(reason) { if (parts.length < 3 && parts.indexOf(reason) === -1) parts.push(reason); });
  return parts.slice(0, 3).join(' • ');
}

function renderFinderResults() {
  var container = document.getElementById('finder-container');
  if (!container) return;
  var answers = finderAnswers;
  var scored = getFinderScoredMatches(answers);
  var results = scored.filter(function(item) { return item.score > 0; }).sort(function(a, b) { return b.score - a.score; }).slice(0, 6);
  if (results.length < 3) {
    var audience = getEffectiveFinderAudience(answers);
    results = results.concat(scored.filter(function(item) {
      return !results.some(function(r) { return r.product.id === item.product.id; }) && (item.meta.audience.indexOf(audience) !== -1 || (audience === 'family' && item.meta.isFamilySafe));
    }).sort(function(a, b) {
      var badgeA = a.product.badge === 'BESTSELLER' || a.product.badge === 'GIFT PICKS' ? 1 : 0;
      var badgeB = b.product.badge === 'BESTSELLER' || b.product.badge === 'GIFT PICKS' ? 1 : 0;
      return badgeB - badgeA || b.score - a.score;
    }).slice(0, 6 - results.length));
  }
  var progress = getFinderQuestions().map(function() { return '<div class="finder-progress-bar filled"></div>'; }).join('');
  var answerChips = getFinderAnswerChips();
  var resultsHtml = results.length ? results.map(function(r, index) {
    var p = r.product;
    var reasonText = getFinderReason(p, answers, r.meta, r.reasons);
    var whyText = r.reasons && r.reasons.length ? r.reasons[0] : (r.meta.players ? r.meta.players.label : 'Closest overlap');
    var safetyText = r.meta.isAdultOnly ? '18+ only' : (r.meta.isFamilySafe ? 'Family-safe' : 'Check suitability');
    return '<article class="finder-result-card' + (index === 0 ? ' finder-result-card-best' : '') + '">' +
      '<span class="finder-match-badge">' + (index === 0 ? 'Strongest match' : 'Good match') + '</span>' +
      '<span class="finder-why-badge">Why: ' + escHtml(whyText) + '</span>' +
      '<img src="' + getProductImg(p) + '" alt="' + escHtml(p.name) + '" loading="lazy" class="finder-result-img" />' +
      '<div class="finder-result-info"><span class="finder-result-name">' + escHtml(p.name) + '</span><span class="finder-result-reason">' + escHtml(reasonText) + '</span><span class="finder-result-meta"><span>KES ' + p.price.toLocaleString() + '</span><span>' + escHtml(safetyText) + '</span><span>' + escHtml(r.meta.players.label) + '</span></span><div class="finder-result-actions"><button type="button" class="finder-result-action" onclick="navigate(\'product\',\'' + p.id + '\')">View match</button><button type="button" class="finder-result-add" onclick="finderQuickAdd(\'' + p.id + '\', event, this)">Quick Add</button></div></div>' +
    '</article>';
  }).join('') : '<div class="finder-empty"><strong>No safe close matches yet.</strong><span>Try broadening your answers or let Majestic Buddy help with a human recommendation.</span><div><button type="button" onclick="initGameFinder()">Broaden filters</button><a href="https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent('Hi Majestic Games World, I used the Game Finder but need help choosing a safe match.') + '" target="_blank" rel="noopener noreferrer">Ask WhatsApp Concierge</a></div></div>';
  container.innerHTML =
    '<div class="finder-card finder-results-card">' +
      '<div class="finder-results-hero">' +
        '<div><span class="finder-kicker">Wizard complete</span><h3 class="finder-results-title">Your Perfect Matches</h3><p class="finder-results-copy">Based on your answers, these are the safest and closest matches.</p></div>' +
        '<button class="finder-reset-btn finder-reset-inline" onclick="initGameFinder()">Start Over</button>' +
      '</div>' +
      '<div class="finder-progress finder-progress-track"><span style="width:100%"></span></div>' +
      (answerChips ? '<div class="finder-answer-tray">' + answerChips + '</div>' : '') +
      '<div class="finder-results-grid">' + resultsHtml + '</div>' +
      '<p class="finder-trust-note">Safety filter active: adult, romantic, drinking, and couples-only games are excluded when Kids, Teens, or Family is selected.</p>' +
    '</div>';
}

var smartShopState = {
  vibe: 'Chill',
  players: '4 players',
  occasion: 'Birthday',
  budget: '1000-2000'
};

function getSmartShopHintHtml() {
  var hints = [
    { label: 'UNO', query: 'uno' },
    { label: 'Puzzles', cat: 'puzzles' },
    { label: 'Monopoly', query: 'monopoly' },
    { label: 'Party games', cat: 'party-games' }
  ];
  return '<div class="smart-shop-search-hint"><span>Trending searches</span><div class="smart-shop-hint-buttons">' + hints.map(function(hint) {
    if (hint.cat) return '<button type="button" onclick="runSmartShopAction({cat:&quot;' + escHtml(hint.cat) + '&quot;})">' + escHtml(hint.label) + '</button>';
    return '<button type="button" onclick="updateShopDiscoverySearch(&quot;' + escHtml(hint.query) + '&quot;)">' + escHtml(hint.label) + '</button>';
  }).join('') + '</div></div>';
}

function findMegaMenuProduct(patterns) {
  patterns = Array.isArray(patterns) ? patterns : [patterns];
  return PRODUCTS.find(function(product) {
    return patterns.some(function(pattern) {
      return pattern.test(product.name || '') || pattern.test(product.slug || '');
    });
  }) || null;
}

function renderMegaProductCard(config) {
  var product = config.product;
  var title = config.title || (product ? product.name : '');
  var price = config.price || (product ? product.price : 0);
  var image = product ? getProductImg(product) : config.image;
  var action = product ? "navigate('product','" + product.id + "');closeShopDropdown()" : "runSmartShopAction({page:'bestsellers'})";
  return '<article class="attached-mega-product" role="menuitem" tabindex="0" onclick="' + action + '" onkeydown="if(event.key===\'Enter\'){this.click()}">' +
    '<span class="attached-mega-badge ' + escHtml(config.badgeClass || '') + '">' + escHtml(config.badge) + '</span>' +
    '<div class="attached-mega-product-img"><img src="' + escHtml(image) + '" alt="' + escHtml(title) + '" loading="lazy" /></div>' +
    '<h5>' + escHtml(title) + '</h5>' +
    '<div class="attached-mega-rating"><span>★★★★★</span><small>' + escHtml(config.reviews) + '</small></div>' +
    '<strong>KES ' + Number(price || 0).toLocaleString() + '</strong>' +
  '</article>';
}

function renderAttachedShopDropdown(menu, dropdown, btn) {
  var leftCats = [
    { id: 'board-games', icon: '🎲', text: 'Strategy, family & classic games' },
    { id: 'card-games', icon: '🃏', text: 'Fun for all ages' },
    { id: 'family-games', icon: '👨‍👩‍👧‍👦', text: 'Bond, laugh & play together' },
    { id: 'kids-games', icon: '🧸', text: 'Safe, fun & educational' },
    { id: 'puzzles', icon: '🧩', text: 'All shapes, sizes & themes' },
    { id: 'party-games', icon: '🎉', text: 'Perfect for parties & gatherings' },
    { id: 'drinking-games', icon: '⚽', label: 'Outdoor & Active Play', text: 'Sports, toys & outdoor fun' },
    { id: 'dolls', icon: '🤖', label: 'Toys & Figures', text: 'Action figures, dolls & more' },
    { id: 'stem-toys', icon: '💡', label: 'Learning & STEM', text: 'Smart toys for curious minds' },
    { id: 'gift-picks', icon: '🎁', label: 'Gifts & Occasions', text: 'Birthday, holiday & more', page: 'gift-picks' }
  ];
  var categoryDescriptions = {
    'board-games': 'Strategy, family & classic games',
    'card-games': 'Fun for all ages',
    'family-games': 'Bond, laugh & play together',
    'kids-games': 'Safe, fun & educational',
    'puzzles': 'All shapes, sizes & themes',
    'trivia-games': 'Quiz nights, facts & challenges',
    'christian-games': 'Faith-based fun and fellowship',
    'stem-toys': 'Smart toys for curious minds',
    'lego-collectible': 'Build, collect and imagine',
    'infant-toys': 'Early learning and baby play',
    'musical-toys': 'Rhythm, sound and creativity',
    'dolls': 'Dolls, pretend play and figures',
    'couples-games': 'Date nights and connection',
    'party-games': 'Perfect for parties & gatherings',
    'drinking-games': 'Playful adult party picks'
  };
  var toyCategoryIds = ['stem-toys', 'lego-collectible', 'infant-toys', 'musical-toys', 'dolls'];
  leftCats = CATEGORIES.filter(function(cat) {
    return toyCategoryIds.indexOf(cat.id) === -1;
  }).map(function(cat) {
    return {
      id: cat.id,
      icon: cat.icon,
      label: cat.label,
      text: categoryDescriptions[cat.id] || ((cat.count || 0) + ' products')
    };
  });
  var toyCategories = toyCategoryIds.map(function(id) {
    return CATEGORIES.find(function(cat) { return cat.id === id; });
  }).filter(Boolean);
  var trendChips = [
    { icon: '🔴', label: 'UNO', query: 'uno' },
    { icon: '🧩', label: 'Puzzles', cat: 'puzzles' },
    { icon: '🎩', label: 'Monopoly', query: 'monopoly' },
    { icon: '🎉', label: 'Party Games', cat: 'party-games' }
  ];
  var occasions = [
    { icon: '🎂', label: 'Birthday Gifts', page: 'gift-picks' },
    { icon: '🎈', label: 'Kids Party', cat: 'kids-games' },
    { icon: '🎄', label: 'Christmas Gifts', page: 'gift-picks' },
    { icon: '🎒', label: 'Back to School', cat: 'stem-toys' },
    { icon: '🎮', label: 'Family Game Night', cat: 'family-games' }
  ];
  var categoryHtml = leftCats.map(function(item) {
    var cat = CATEGORIES.find(function(c) { return c.id === item.id; });
    var label = item.label || (cat && cat.label) || item.id;
    var action = item.page ? "runSmartShopAction({page:'" + item.page + "'})" : "runSmartShopAction({cat:'" + item.id + "'})";
    return '<button type="button" class="attached-mega-cat" role="menuitem" onclick="' + action + '">' +
      '<span class="attached-mega-cat-icon">' + item.icon + '</span><span><b>' + escHtml(label) + '</b><small>' + escHtml(item.text) + '</small></span><i>›</i>' +
    '</button>';
  }).join('') +
    '<div class="attached-mega-cat-group">' +
      '<button type="button" class="attached-mega-cat attached-mega-cat-toggle" role="menuitem" aria-expanded="false" onclick="toggleMegaCategoryGroup(this)">' +
        '<span class="attached-mega-cat-icon">T</span><span><b>TOYS</b><small>STEM, LEGO, infants, music & dolls</small></span><i>+</i>' +
      '</button>' +
      '<div class="attached-mega-subcats">' +
        toyCategories.map(function(cat) {
          return '<button type="button" class="attached-mega-subcat" role="menuitem" onclick="runSmartShopAction({cat:\'' + cat.id + '\'})">' +
            '<span>' + cat.icon + '</span><b>' + escHtml(cat.label) + '</b><small>' + (cat.count || 0) + ' items</small>' +
          '</button>';
        }).join('') +
      '</div>' +
    '</div>';
  var chipHtml = trendChips.map(function(item) {
    var payload = item.cat ? "{cat:'" + item.cat + "'}" : "{query:'" + item.query + "'}";
    return '<button type="button" class="attached-mega-chip" role="menuitem" onclick="runSmartShopAction(' + payload + ')"><span>' + item.icon + '</span>' + escHtml(item.label) + '</button>';
  }).join('');
  var products = [
    { product: findMegaMenuProduct(/Catan/i), badge: '🔥 Best Seller', reviews: '(1.2k)', badgeClass: 'warm', title: 'Catan Board Game', price: 4999 },
    { product: findMegaMenuProduct(/Exploding Kittens/i), badge: '● New', reviews: '(890)', badgeClass: 'fresh', title: 'Exploding Kittens', price: 2500 },
    { product: findMegaMenuProduct(/Monopoly Classic|Monopoly Original/i), badge: '🔥 Hot Pick', reviews: '(1.1k)', badgeClass: 'warm', title: 'Monopoly Classic', price: 4200 },
    { product: findMegaMenuProduct(/Uno Classic/i), badge: '🔥 Popular', reviews: '(2.5k)', badgeClass: 'warm', title: 'UNO Card Game', price: 700 }
  ];
  var productHtml = products.map(renderMegaProductCard).join('');
  var occasionHtml = occasions.map(function(item) {
    var payload = item.cat ? "{cat:'" + item.cat + "'}" : "{page:'" + item.page + "'}";
    return '<button type="button" role="menuitem" onclick="runSmartShopAction(' + payload + ')"><span>' + item.icon + '</span>' + escHtml(item.label) + '</button>';
  }).join('');
  var waUrl = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent('Hi Majestic Games World, I need help choosing a game or gift.');

  menu.innerHTML =
    '<div class="attached-mega-menu" role="presentation">' +
      '<div class="attached-mega-pointer" aria-hidden="true"></div>' +
      '<aside class="attached-mega-left"><h4><span>⌘</span> Browse Categories</h4><div class="attached-mega-cat-list">' + categoryHtml + '</div><button type="button" class="attached-mega-view" onclick="runSmartShopAction({page:\'shop\'})">View all categories <span>→</span></button></aside>' +
      '<main class="attached-mega-center"><section><h4><span>↗</span> Trending</h4><div class="attached-mega-chips">' + chipHtml + '</div></section><section class="attached-mega-picks"><h4><span>🔥</span> Popular Picks</h4><div class="attached-mega-products">' + productHtml + '</div></section><div class="attached-mega-reco"><div><b>Not sure what to pick?</b><span>🎯</span><p>Get smart recommendations based on age, budget & occasion.</p></div><button type="button" onclick="navigate(\'gift-picks\');closeShopDropdown()">Get Recommendation</button></div></main>' +
      '<aside class="attached-mega-right"><section class="attached-mega-panel gift"><h4><span>✣</span> AI Gift Finder <em>BETA</em></h4><p>Tell us who it’s for and we’ll find the perfect gift.</p><button type="button" onclick="navigate(\'gift-picks\');closeShopDropdown()">Find My Gift</button></section><section class="attached-mega-panel occasions"><h4><span>🎁</span> Shop By Occasion</h4><div>' + occasionHtml + '</div><button type="button" onclick="navigate(\'gift-picks\');closeShopDropdown()">View all occasions <span>→</span></button></section><section class="attached-mega-help"><span>☘</span><div><small>Need help fast?</small><b>Chat on WhatsApp</b><p>We reply in 2-5 mins</p></div><a href="' + waUrl + '" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">›</a></section></aside>' +
      '<footer class="attached-mega-trust"><span><i>🛡️</i><b>100% Original Products</b><small>Trusted brands only</small></span><span><i>🚚</i><b>Fast & Reliable Delivery</b><small>Nairobi same-day delivery</small></span><span><i>💳</i><b>Secure Payments</b><small>Safe, simple & secure</small></span><span><i>↻</i><b>Easy Returns</b><small>Hassle-free returns</small></span></footer>' +
    '</div>';

  if (btn) {
    btn.setAttribute('aria-expanded', 'false');
    if (!btn.dataset.shopKeyReady) {
      btn.addEventListener('keydown', handleShopDropdownKeydown);
      btn.dataset.shopKeyReady = 'true';
    }
  }
  if (!menu.dataset.shopKeyReady) {
    menu.addEventListener('keydown', handleShopDropdownKeydown);
    menu.dataset.shopKeyReady = 'true';
  }
  if (dropdown && !dropdown.dataset.smartShopReady) {
    dropdown.dataset.smartShopReady = 'true';
  }
}

function toggleMegaCategoryGroup(button) {
  var group = button && button.closest ? button.closest('.attached-mega-cat-group') : null;
  if (!group) return;
  var isOpen = group.classList.toggle('open');
  button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  var indicator = button.querySelector('i');
  if (indicator) indicator.textContent = isOpen ? '-' : '+';
}

function initShopDropdown() {
  var menu = document.getElementById('shop-dropdown-menu');
  var dropdown = document.getElementById('shop-dropdown');
  var btn = document.getElementById('shop-dropdown-btn');
  if (!menu) return;
  renderAttachedShopDropdown(menu, dropdown, btn);
  return;

  var moods = [
    { label: 'Family Night', icon: '??', cat: 'family-games' },
    { label: 'Couple Night', icon: '?', cat: 'couples-games' },
    { label: 'Kids Learning', icon: '??', cat: 'kids-games' },
    { label: 'Party Games', icon: '??', cat: 'party-games' },
    { label: 'Brain Challenge', icon: '??', cat: 'puzzles' },
    { label: 'Gifts Under Budget', icon: '??', page: 'gift-picks' },
    { label: 'School Group', icon: '??', query: 'school church group family games' }
  ];
  var categories = [
    { id: 'board-games', badge: 'Premium' },
    { id: 'card-games', badge: '' },
    { id: 'family-games', badge: 'Hot' },
    { id: 'kids-games', badge: 'Kids Love' },
    { id: 'puzzles', badge: '' },
    { id: 'party-games', badge: '' }
  ].map(function(item) {
    var cat = CATEGORIES.find(function(c) { return c.id === item.id; });
    return cat ? { cat: cat, badge: item.badge } : null;
  }).filter(Boolean);
  var needs = [
    { icon: '?', title: 'Premium Strategy', text: 'For collectors and serious players.', cat: 'board-games' },
    { icon: '??', title: 'Party Starters', text: 'Fast, loud, replayable fun.', cat: 'party-games' },
    { icon: '??', title: 'Family Classics', text: 'Safe picks everyone enjoys.', cat: 'family-games' },
    { icon: '??', title: 'Learning Gifts', text: 'Smart toys, puzzles and STEM.', cat: 'stem-toys' }
  ];
  var vibeOptions = ['Chill', 'Competitive', 'Funny', 'Romantic', 'Chaotic'];
  var playerOptions = ['2 players', '4 players', '6 players', '8+ players'];
  var occasionOptions = ['Birthday', 'Couple Night', 'School Event', 'House Party', 'Family Gathering'];
  var budgetOptions = ['Under 1000', '1000-2000', '2000-5000', 'Premium'];
  var conciergeMessage = 'Hi Majestic Games World, help me choose a game. My budget is __, age/group is __, and occasion is __.';
  var conciergeUrl = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(conciergeMessage);

  menu.innerHTML = '<div class="smart-shop-v2" role="presentation">' +
    '<div class="smart-shop-v2-close-row"><button type="button" onclick="closeShopDropdown(true)" aria-label="Close Smart Shop">Close</button></div>' +
    '<div class="smart-shop-v2-top"><div class="smart-shop-v2-intro"><span>Smart Shop Discovery</span><h3>Your game night, decoded.</h3><p>Pick a mood, group size or occasion. Majestic Buddy narrows the shelf for you.</p></div><div class="smart-shop-proof"><span>Trending in Nairobi</span><span>Popular tonight</span><span>Often bought together</span><span>Same-day delivery available</span></div></div>' +
    '<div class="smart-shop-v2-search"><input id="smart-shop-search-input" type="search" placeholder="Search by game, mood, age, or occasion..." autocomplete="off" oninput="updateShopDiscoverySearch(this.value)" aria-label="Search by game, mood, age, or occasion" /><div class="smart-shop-search-chips"><button onclick="updateShopDiscoverySearch(\'family night\')">Family night</button><button onclick="updateShopDiscoverySearch(\'birthday gift\')">Birthday gift</button><button onclick="updateShopDiscoverySearch(\'party games\')">Party games</button><button onclick="updateShopDiscoverySearch(\'kids learning\')">Kids learning</button></div><div id="smart-shop-search-results" class="smart-shop-search-results" aria-live="polite">' + getSmartShopHintHtml() + '</div></div>' +
    '<div class="smart-shop-v2-main">' +
      '<section class="smart-shop-v2-panel smart-shop-v2-moods"><h4>Mood shopping</h4><div class="smart-shop-v2-pills">' + moods.map(function(item) { return '<button type="button" role="menuitem" onclick="runSmartShopAction(' + escHtml(JSON.stringify(item)) + ')"><span>' + item.icon + '</span>' + escHtml(item.label) + '</button>'; }).join('') + '</div></section>' +
      '<section class="smart-shop-v2-panel smart-shop-v2-cats"><h4>Main categories</h4><div>' + categories.map(function(item) { return '<a role="menuitem" href="' + getRouteUrl('category', item.cat.id) + '" onclick="event.preventDefault();navigate(\'category\',\'' + item.cat.id + '\');closeShopDropdown()"><span>' + item.cat.icon + '</span><b>' + escHtml(item.cat.label) + '</b><small>' + item.cat.count + ' items</small>' + (item.badge ? '<em>' + escHtml(item.badge) + '</em>' : '') + '</a>'; }).join('') + '</div></section>' +
      '<section class="smart-shop-v2-panel smart-shop-v2-needs"><h4>Need something for...</h4><div>' + needs.map(function(item) { return '<button type="button" role="menuitem" onclick="runSmartShopAction(' + escHtml(JSON.stringify(item)) + ')"><span>' + item.icon + '</span><b>' + escHtml(item.title) + '</b><small>' + escHtml(item.text) + '</small></button>'; }).join('') + '</div></section>' +
    '</div>' +
    '<div class="smart-shop-v2-assistant"><section class="smart-shop-v2-lab"><button type="button" class="smart-shop-panel-toggle" aria-expanded="false" aria-controls="smart-ai-lab-panel" onclick="toggleSmartShopPanel(\'smart-ai-lab-panel\', this)"><span>AI-style discovery lab</span><b>Build a Game Night</b></button><div class="smart-shop-expand-panel" id="smart-ai-lab-panel">' +
      '<div class="smart-shop-v2-control"><label>Tonight\'s Vibe</label><div>' + vibeOptions.map(function(vibe) { return '<button type="button" data-smart-vibe="' + escHtml(vibe) + '" onmouseenter="setSmartShopVibe(\'' + escHtml(vibe) + '\')" onclick="setSmartShopVibe(\'' + escHtml(vibe) + '\')">' + escHtml(vibe) + '</button>'; }).join('') + '</div></div>' +
      '<div class="smart-shop-v2-control smart-shop-player-wheel"><label>Multiplayer Wheel</label><div>' + playerOptions.map(function(players) { return '<button type="button" data-smart-players="' + escHtml(players) + '" onclick="setSmartShopPlayers(\'' + escHtml(players) + '\')">' + escHtml(players) + '</button>'; }).join('') + '</div></div>' +
      '<div class="smart-shop-v2-control"><label>Occasion</label><div>' + occasionOptions.map(function(occasion) { return '<button type="button" data-smart-occasion="' + escHtml(occasion) + '" onmouseenter="setSmartShopOccasion(\'' + escHtml(occasion) + '\')" onclick="setSmartShopOccasion(\'' + escHtml(occasion) + '\')">' + escHtml(occasion) + '</button>'; }).join('') + '</div></div>' +
      '<div class="smart-shop-v2-control"><label>Budget</label><div>' + budgetOptions.map(function(budget) { return '<button type="button" data-smart-budget="' + escHtml(budget) + '" onclick="setSmartShopBudget(\'' + escHtml(budget) + '\')">' + escHtml(budget) + '</button>'; }).join('') + '</div></div>' +
      '</div><div class="smart-shop-v2-setup" id="smart-match-card"><small>Majestic Match Engine</small><span id="smart-setup-title">Tonight\'s Match</span><strong id="smart-match-products"></strong><p id="smart-setup-copy"></p><a id="smart-setup-wa" target="_blank" rel="noopener noreferrer" href="#">Reserve this setup on WhatsApp</a></div></section>' +
      '<section class="smart-shop-v2-strip"><div class="smart-shop-v2-trending"><button class="smart-shop-panel-toggle" aria-expanded="false" aria-controls="smart-recs-panel" onclick="toggleSmartShopPanel(\'smart-recs-panel\', this)"><span>Open recommendations</span><b>Trending and popular picks</b></button><div class="smart-shop-expand-panel" id="smart-recs-panel"><button onclick="runSmartShopAction({page:\'bestsellers\'})"><span>Popular tonight</span><b>Bestsellers</b></button><button onclick="runSmartShopAction({page:\'new-arrivals\'})"><span>Fresh shelf</span><b>New Arrivals</b></button><button onclick="runSmartShopAction({page:\'gift-picks\'})"><span>Best gift</span><b>Gift Picks</b></button></div></div>' +
      '<div class="smart-shop-v2-gift"><button class="smart-shop-panel-toggle" aria-expanded="false" aria-controls="smart-gift-panel" onclick="toggleSmartShopPanel(\'smart-gift-panel\', this)"><span>Open gift finder</span><b>Find a gift by age and budget</b></button><div class="smart-shop-expand-panel" id="smart-gift-panel"><select id="smart-gift-age"><option>Kids</option><option>Teens</option><option>Adults</option><option>Family</option></select><select id="smart-gift-budget"><option>Under 1000</option><option>1000-2000</option><option>2000-5000</option><option>Premium</option></select><select id="smart-gift-occasion"><option>Birthday</option><option>Family Night</option><option>School Event</option><option>House Party</option></select><button onclick="runSmartGiftFinder()">Show ideas</button></div></div>' +
      '<aside class="smart-shop-v2-concierge"><div class="smart-shop-wa-orbit">WA</div><span><i></i> Majestic Buddy Online</span><h4>Not sure what to pick?</h4><p>Usually replies in 2-5 mins with options matched to your budget, age group and occasion.</p><a role="menuitem" href="' + conciergeUrl + '" target="_blank" rel="noopener noreferrer">Ask on WhatsApp</a></aside></section></div>' +
  '</div>';

  if (btn) {
    btn.setAttribute('aria-expanded', 'false');
    if (!btn.dataset.shopKeyReady) {
      btn.addEventListener('keydown', handleShopDropdownKeydown);
      btn.dataset.shopKeyReady = 'true';
    }
  }
  if (!menu.dataset.shopKeyReady) {
    menu.addEventListener('keydown', handleShopDropdownKeydown);
    menu.dataset.shopKeyReady = 'true';
  }
  if (dropdown && !dropdown.dataset.smartShopReady) {
    dropdown.dataset.smartShopReady = 'true';
  }
  updateSmartShopAssistant();
}

function toggleShopDropdown() {
  var menu = document.getElementById('shop-dropdown-menu');
  if (menu && menu.classList.contains('open')) closeShopDropdown();
  else openShopDropdown();
}

function openShopDropdown() {
  var btn = document.getElementById('shop-dropdown-btn');
  var menu = document.getElementById('shop-dropdown-menu');
  if (!btn || !menu) return;
  positionSmartShopMenu();
  menu.classList.add('open');
  btn.classList.add('open');
  btn.setAttribute('aria-expanded', 'true');
}

function positionSmartShopMenu() {
  var dropdown = document.getElementById('shop-dropdown');
  var menu = document.getElementById('shop-dropdown-menu');
  if (!dropdown || !menu) return;
  var panelWidth = Math.min(1080, Math.max(320, window.innerWidth - 96));
  var dropdownRect = dropdown.getBoundingClientRect();
  var dropdownLeft = dropdownRect.left;
  var left = Math.max(28, (window.innerWidth - panelWidth) / 2) - dropdownLeft;
  menu.style.width = panelWidth + 'px';
  menu.style.left = left + 'px';
  menu.style.top = Math.max(dropdownRect.height + 10, 48) + 'px';
}

function closeShopDropdown(returnFocus) {
  var btn = document.getElementById('shop-dropdown-btn');
  var menu = document.getElementById('shop-dropdown-menu');
  var wasOpen = menu && menu.classList.contains('open');
  if (btn) {
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }
  if (menu) menu.classList.remove('open');
  if (returnFocus && wasOpen && btn) btn.focus();
}

function runSmartShopAction(action) {
  if (!action) return;
  if (action.cat) navigate('category', action.cat);
  else if (action.page) navigate(action.page);
  else if (action.query) {
    shopSearch = action.query;
    navigate('shop');
    renderShop();
  }
  closeShopDropdown();
  closeMobileNav();
}

function runSmartGiftFinder() {
  var age = document.getElementById('smart-gift-age');
  var budget = document.getElementById('smart-gift-budget');
  var occasion = document.getElementById('smart-gift-occasion');
  shopSearch = [
    age ? age.value : '',
    budget ? budget.value : '',
    occasion ? occasion.value : '',
    'gift'
  ].join(' ').trim();
  navigate('gift-picks');
  closeShopDropdown();
  closeMobileNav();
}

function updateShopDiscoverySearch(query) {
  var resultsEl = document.getElementById('smart-shop-search-results');
  if (!resultsEl) return;
  query = (query || '').trim().toLowerCase();
  if (!query) {
    resultsEl.innerHTML = getSmartShopHintHtml();
    return;
  }
  var catMatches = CATEGORIES.filter(function(cat) {
    return (cat.label + ' ' + cat.id).toLowerCase().indexOf(query) !== -1;
  }).slice(0, 3);
  var productMatches = PRODUCTS.filter(function(product) {
    return [product.name, product.shortDescription, product.cat, product.slug].join(' ').toLowerCase().indexOf(query) !== -1;
  }).slice(0, 4);
  var html = catMatches.map(function(cat) {
    return '<button type="button" role="menuitem" onclick="navigate(\'category\',\'' + cat.id + '\');closeShopDropdown()"><span>Category</span><b>' + escHtml(cat.label) + '</b></button>';
  }).join('');
  html += productMatches.map(function(product) {
    return '<button type="button" role="menuitem" onclick="navigate(\'product\',\'' + product.id + '\');closeShopDropdown()"><span>KES ' + product.price.toLocaleString() + '</span><b>' + escHtml(product.name) + '</b></button>';
  }).join('');
  resultsEl.innerHTML = html || '<div class="smart-shop-no-results">No instant matches. Try a broader word.</div>';
}

function handleShopDropdownKeydown(e) {
  var menu = document.getElementById('shop-dropdown-menu');
  var isOpen = menu && menu.classList.contains('open');
  if (e.key === 'Tab' && isOpen) {
    closeShopDropdown(false);
    return;
  }
  if (e.key === 'Escape' && isOpen) {
    e.preventDefault();
    closeShopDropdown(true);
    return;
  }
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
  if (!isOpen && e.key === 'ArrowDown') openShopDropdown();
  var focusables = Array.prototype.slice.call(document.querySelectorAll('#shop-dropdown-menu a, #shop-dropdown-menu button, #shop-dropdown-menu input, #shop-dropdown-menu select'))
    .filter(function(el) { return !el.disabled && el.offsetParent !== null; });
  if (!focusables.length) return;
  e.preventDefault();
  var idx = focusables.indexOf(document.activeElement);
  if (e.key === 'Home') idx = 0;
  else if (e.key === 'End') idx = focusables.length - 1;
  else if (e.key === 'ArrowDown') idx = idx < focusables.length - 1 ? idx + 1 : 0;
  else idx = idx > 0 ? idx - 1 : focusables.length - 1;
  focusables[idx].focus();
}

function setSmartShopVibe(vibe) {
  smartShopState.vibe = vibe;
  updateSmartShopAssistant();
}

function setSmartShopPlayers(players) {
  smartShopState.players = players;
  updateSmartShopAssistant();
}

function setSmartShopOccasion(occasion) {
  smartShopState.occasion = occasion;
  updateSmartShopAssistant();
}

function setSmartShopBudget(budget) {
  smartShopState.budget = budget;
  updateSmartShopAssistant();
}

function toggleSmartShopPanel(panelId, trigger) {
  var panel = document.getElementById(panelId);
  if (!panel) return;
  var isOpen = panel.classList.toggle('open');
  if (trigger) {
    trigger.classList.toggle('open', isOpen);
    trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }
  positionSmartShopMenu();
}

function getSmartShopRecommendation() {
  var vibe = smartShopState.vibe;
  if (smartShopState.occasion === 'Couple Night' || vibe === 'Romantic') return { title: 'Tonight\'s Match', picks: 'Conversation Cards + Monopoly Deal + Puzzle', copy: 'Perfect for ' + smartShopState.players + ' | ' + vibe + ' vibe | ' + smartShopState.occasion + '.' };
  if (smartShopState.occasion === 'School Event') return { title: 'Tonight\'s Match', picks: 'UNO + Jenga + Snakes & Ladders', copy: 'Perfect for groups that need simple rules, quick rounds and durable choices.' };
  if (vibe === 'Chaotic' || smartShopState.occasion === 'House Party') return { title: 'Tonight\'s Match', picks: 'Exploding Kittens + UNO + 5 Seconds', copy: 'Perfect for ' + smartShopState.players + ' | funny pressure | house-party energy.' };
  if (vibe === 'Competitive') return { title: 'Tonight\'s Match', picks: 'Catan + Codenames + Chess', copy: 'Perfect for players who want tension, skill and replay value.' };
  if (vibe === 'Funny') return { title: 'Tonight\'s Match', picks: 'Codenames + Exploding Kittens + UNO', copy: 'Perfect for ' + smartShopState.players + ' | Funny vibe | ' + smartShopState.occasion + '.' };
  return { title: 'Tonight\'s Match', picks: 'Jenga + UNO + Family Board Game', copy: 'Perfect for relaxed play, gifting and same-day Nairobi delivery.' };
}

function updateSmartShopAssistant() {
  var rec = getSmartShopRecommendation();
  var title = document.getElementById('smart-setup-title');
  var picks = document.getElementById('smart-match-products');
  var copy = document.getElementById('smart-setup-copy');
  var wa = document.getElementById('smart-setup-wa');
  var card = document.getElementById('smart-match-card');
  if (card) {
    card.classList.remove('is-morphing');
    void card.offsetWidth;
    card.classList.add('is-morphing');
  }
  if (title) title.textContent = rec.title;
  if (picks) picks.textContent = rec.picks;
  if (copy) copy.textContent = rec.copy + ' Budget: ' + smartShopState.budget + '.';
  if (wa) {
    var message = 'Hi Majestic Games World, reserve this game night setup: ' + rec.picks + '. Players: ' + smartShopState.players + ', vibe: ' + smartShopState.vibe + ', occasion: ' + smartShopState.occasion + ', budget: ' + smartShopState.budget + '.';
    wa.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
  }
  document.querySelectorAll('[data-smart-vibe]').forEach(function(el) {
    el.classList.toggle('active', el.getAttribute('data-smart-vibe') === smartShopState.vibe);
  });
  document.querySelectorAll('[data-smart-players]').forEach(function(el) {
    el.classList.toggle('active', el.getAttribute('data-smart-players') === smartShopState.players);
  });
  document.querySelectorAll('[data-smart-occasion]').forEach(function(el) {
    el.classList.toggle('active', el.getAttribute('data-smart-occasion') === smartShopState.occasion);
  });
  document.querySelectorAll('[data-smart-budget]').forEach(function(el) {
    el.classList.toggle('active', el.getAttribute('data-smart-budget') === smartShopState.budget);
  });
}

/* ─────────────────────────────────────────────
   MOBILE NAV
───────────────────────────────────────────── */
function initMobileNav() {
  var catsEl = document.getElementById('mobile-nav-cats');
  if (!catsEl) return;
  var featuredCatIds = ['board-games', 'card-games', 'family-games', 'kids-games', 'puzzles', 'party-games'];
  var featuredCats = featuredCatIds.map(function(id) {
    return CATEGORIES.find(function(cat) { return cat.id === id; });
  }).filter(Boolean);
  var conciergeMessage = 'Hi Majestic Games World, help me choose a game. My budget is __, age/group is __, and occasion is __.';
  var conciergeUrl = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(conciergeMessage);

  catsEl.innerHTML =
    '<div class="mobile-smart-search"><label for="mobile-smart-search">Smart search</label><input id="mobile-smart-search" type="search" placeholder="Search games, toys, puzzles..." autocomplete="off" oninput="updateMobileSmartSearch(this.value)" /><div id="mobile-smart-search-results" aria-live="polite"></div></div>' +
    '<details class="mobile-smart-accordion" open><summary>Shop by Category</summary><div>' +
      featuredCats.map(function(cat) {
        return '<a href="#" class="mobile-nav-cat-link" onclick="navigate(\'category\',\'' + cat.id + '\');closeMobileNav()"><span style="font-size:1.25rem">' + cat.icon + '</span><span>' + cat.label + '</span></a>';
      }).join('') +
      '<a href="#" class="mobile-nav-cat-link mobile-nav-all-link" onclick="navigate(\'shop\');closeMobileNav()"><span style="font-size:1.25rem">+</span><span>View All Products</span></a>' +
    '</div></details>' +
    '<details class="mobile-smart-accordion"><summary>Shop by Mood</summary><div class="mobile-smart-chip-grid">' +
      '<button onclick="runSmartShopAction({cat:\'family-games\'})">Family Night</button>' +
      '<button onclick="runSmartShopAction({cat:\'couples-games\'})">Couple Night</button>' +
      '<button onclick="runSmartShopAction({cat:\'kids-games\'})">Kids Learning</button>' +
      '<button onclick="runSmartShopAction({cat:\'party-games\'})">Party Games</button>' +
      '<button onclick="runSmartShopAction({cat:\'puzzles\'})">Brain Challenge</button>' +
      '<button onclick="runSmartShopAction({page:\'gift-picks\'})">Gifts Under Budget</button>' +
    '</div></details>' +
    '<details class="mobile-smart-accordion"><summary>Gift Finder</summary><div class="mobile-smart-gift">' +
      '<select id="mobile-smart-age"><option>Kids</option><option>Teens</option><option>Adults</option><option>Family</option></select>' +
      '<select id="mobile-smart-budget"><option>Under 1000</option><option>1000-2000</option><option>2000-5000</option><option>Premium</option></select>' +
      '<select id="mobile-smart-occasion"><option>Birthday</option><option>Family Night</option><option>School Group</option><option>Christmas</option></select>' +
      '<button onclick="runMobileSmartGiftFinder()">Show gift ideas</button>' +
    '</div></details>' +
    '<details class="mobile-smart-accordion mobile-smart-whatsapp"><summary>Ask on WhatsApp</summary><div><p>Not sure what to pick? Majestic Buddy can help.</p><a href="' + conciergeUrl + '" target="_blank" rel="noopener noreferrer" class="btn-wa">Ask Majestic Buddy on WhatsApp</a></div></details>';
}

function updateMobileSmartSearch(query) {
  var resultsEl = document.getElementById('mobile-smart-search-results');
  if (!resultsEl) return;
  query = (query || '').trim().toLowerCase();
  if (!query) {
    resultsEl.innerHTML = '';
    return;
  }
  var productMatches = PRODUCTS.filter(function(product) {
    return [product.name, product.shortDescription, product.cat, product.slug].join(' ').toLowerCase().indexOf(query) !== -1;
  }).slice(0, 4);
  var categoryMatches = CATEGORIES.filter(function(cat) {
    return (cat.label + ' ' + cat.id).toLowerCase().indexOf(query) !== -1;
  }).slice(0, 2);
  var html = categoryMatches.map(function(cat) {
    return '<button type="button" onclick="navigate(\'category\',\'' + cat.id + '\');closeMobileNav()"><span>Category</span><b>' + escHtml(cat.label) + '</b></button>';
  }).join('');
  html += productMatches.map(function(product) {
    return '<button type="button" onclick="navigate(\'product\',\'' + product.id + '\');closeMobileNav()"><span>KES ' + product.price.toLocaleString() + '</span><b>' + escHtml(product.name) + '</b></button>';
  }).join('');
  resultsEl.innerHTML = html || '<p>No instant matches. Try a broader word.</p>';
}

function runMobileSmartGiftFinder() {
  var age = document.getElementById('mobile-smart-age');
  var budget = document.getElementById('mobile-smart-budget');
  var occasion = document.getElementById('mobile-smart-occasion');
  shopSearch = [
    age ? age.value : '',
    budget ? budget.value : '',
    occasion ? occasion.value : '',
    'gift'
  ].join(' ').trim();
  navigate('gift-picks');
  closeMobileNav();
}

function toggleMobileNav() {
  var nav = document.getElementById('mobile-nav');
  var overlay = document.getElementById('mobile-overlay');
  var btn = document.getElementById('hamburger-btn');
  var hamburger = document.getElementById('hamburger-icon');
  var closeIcon = document.getElementById('close-icon');
  if (!nav || !overlay) return;
  var isOpen = nav.classList.contains('open');

  nav.classList.toggle('open', !isOpen);
  overlay.classList.toggle('open', !isOpen);
  document.body.style.overflow = isOpen ? '' : 'hidden';
  if (btn) btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');

  if (hamburger) hamburger.style.display = isOpen ? '' : 'none';
  if (closeIcon) closeIcon.style.display = isOpen ? 'none' : '';
  if (!isOpen) {
    window.setTimeout(function() {
      var closeBtn = nav.querySelector('.mobile-nav-close');
      if (closeBtn) closeBtn.focus();
      else nav.focus();
    }, 250);
  } else if (btn) {
    btn.focus();
  }
}

function closeMobileNav(returnFocus) {
  var nav = document.getElementById('mobile-nav');
  var overlay = document.getElementById('mobile-overlay');
  var btn = document.getElementById('hamburger-btn');
  var hamburger = document.getElementById('hamburger-icon');
  var closeIcon = document.getElementById('close-icon');
  if (!nav || !overlay) return;
  var wasOpen = nav.classList.contains('open');

  nav.classList.remove('open');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  if (btn) btn.setAttribute('aria-expanded', 'false');

  if (hamburger) hamburger.style.display = '';
  if (closeIcon) closeIcon.style.display = 'none';
  if (returnFocus && wasOpen && btn) btn.focus();
}

/* ─────────────────────────────────────────────
   SEARCH
───────────────────────────────────────────── */
var searchOpen = false;

function toggleSearch() {
  var container = document.getElementById('search-container');
  var input = document.getElementById('search-input');
  searchOpen = !searchOpen;
  if (container) container.classList.toggle('search-active', searchOpen);
  var panel = document.getElementById('search-panel');
  if (panel) panel.classList.toggle('open', searchOpen && !!(input && input.value.trim()));
  if (searchOpen) {
    setTimeout(function() {
      if (input) input.focus();
    }, 100);
  }
}

function closeSearch() {
  searchOpen = false;
  var container = document.getElementById('search-container');
  if (container) container.classList.remove('search-active');
  var panel = document.getElementById('search-panel');
  if (panel) panel.classList.remove('open');
}

function clearSearch() {
  var input = document.getElementById('search-input');
  if (input) { input.value = ''; input.focus(); }
  var clearBtn = document.getElementById('search-clear-btn');
  if (clearBtn) clearBtn.style.display = 'none';
  document.getElementById('search-results-panel').innerHTML = '';
}

function initSearch() {
  var input = document.getElementById('search-input');
  if (!input) return;

  input.addEventListener('input', function() {
    var q = this.value.trim();
    var container = document.getElementById('search-container');
    var clearBtn = document.getElementById('search-clear-btn');
    var panel = document.getElementById('search-results-panel');
    var searchPanel = document.getElementById('search-panel');
    if (container) container.classList.add('search-active');
    if (clearBtn) clearBtn.style.display = q ? '' : 'none';
    if (searchPanel) {
      searchOpen = !!q;
      searchPanel.classList.toggle('open', !!q);
    }

    if (!q) {
      if (panel) panel.innerHTML = '';
      return;
    }

    var results = searchProducts(q).slice(0, 6);
    if (!panel) return;

    if (results.length === 0) {
      panel.innerHTML = '<div class="search-no-results">No results for "<strong>' + escHtml(q) + '</strong>"</div>';
      return;
    }

    panel.innerHTML =
      '<div class="search-results">' +
        results.map(function(p) {
          return '<a href="#" class="search-result-item" onclick="navigate(\'product\',\'' + p.id + '\');closeSearch()">' +
            '<img class="search-result-img" src="' + getProductImg(p) + '" alt="' + escHtml(p.name) + '" loading="lazy" />' +
            '<div>' +
              '<div class="search-result-name">' + escHtml(p.name) + '</div>' +
              '<div class="search-result-price">KES ' + p.price.toLocaleString() + '</div>' +
            '</div>' +
          '</a>';
        }).join('') +
      '</div>' +
      '<div class="search-results-footer">' +
        '<a href="#" onclick="navigate(\'shop\');shopSearch=\'' + escHtml(q) + '\';renderShop();closeSearch()">See all results for "' + escHtml(q) + '" →</a>' +
      '</div>';
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeSearch();
  });
}

/* ─────────────────────────────────────────────
    CONTACT PAGE — DELIVERY ZONES
──────────────────────────────────────────── */
function renderContactPage() {
  var page = document.getElementById('page-contact');
  if (!page) return;

  page.innerHTML =
    '<section class="page-header collection-hero collection-hero-contact">' +
      '<div class="container">' +
        '<span class="hero-kicker">Talk to Majestic Games</span>' +
        '<h1 class="page-header-title">Contact Us</h1>' +
        '<p class="page-header-sub">Need help choosing a game, confirming stock, planning delivery, or picking a gift? Reach us before you buy and we will help match the right product to the people, age range, budget, and occasion.</p>' +
        '<div class="hero-points">' +
          '<span>WhatsApp recommendations</span>' +
          '<span>Nairobi delivery support</span>' +
          '<span>Store pickup guidance</span>' +
        '</div>' +
      '</div>' +
    '</section>' +
    '<section class="contact-section contact-section-modern">' +
      '<div class="container">' +
        '<div class="contact-modern-grid">' +
          '<div class="contact-main-column">' +
            '<div class="contact-banner">' +
              '<div class="contact-banner-icon">KES</div>' +
              '<div><strong>Free Nairobi delivery over KES 8,000</strong><p>Add enough games or toys to your cart and qualify for complimentary Nairobi delivery.</p></div>' +
            '</div>' +
            '<div class="contact-info-card contact-modern-card">' +
              '<div class="contact-card-head"><span>Delivery</span><h2>Choose how you receive your order</h2></div>' +
              '<div class="delivery-option-grid">' +
                renderDeliveryOption('Pickup', 'Free', 'Commerce House, Moi Avenue. Best if you want to inspect or collect fast.') +
                renderDeliveryOption('Same-day', 'Nairobi', 'Available for confirmed orders before 2PM, depending on rider availability.') +
                renderDeliveryOption('Next-day', 'Flexible', 'Ideal for late orders, bulky games, or areas outside central Nairobi.') +
                renderDeliveryOption('Countrywide', '2-4 days', 'We send orders to towns across Kenya using reliable courier options.') +
              '</div>' +
            '</div>' +
            '<div class="contact-info-card contact-modern-card">' +
              '<div class="contact-card-head"><span>Nairobi zones</span><h2>Delivery fees by area</h2></div>' +
              '<div id="contact-delivery-zones-nairobi" class="contact-zone-grid"></div>' +
            '</div>' +
            '<div class="contact-info-card contact-modern-card">' +
              '<div class="contact-card-head"><span>Outside Nairobi</span><h2>Countrywide delivery guide</h2></div>' +
              '<div class="delivery-table-wrap">' +
                '<table class="delivery-table">' +
                  '<thead><tr><th>Region</th><th>Towns</th><th>Fee</th><th>Time</th></tr></thead>' +
                  '<tbody>' +
                    '<tr><td>Central</td><td>Thika, Kiambu, Limuru</td><td>KES 500</td><td>1-2 days</td></tr>' +
                    '<tr><td>Coast</td><td>Mombasa, Malindi, Kilifi</td><td>KES 700</td><td>2-3 days</td></tr>' +
                    '<tr><td>Western</td><td>Kisumu, Eldoret, Nakuru</td><td>KES 600</td><td>2-3 days</td></tr>' +
                    '<tr><td>Eastern</td><td>Meru, Embu, Machakos</td><td>KES 600</td><td>2-3 days</td></tr>' +
                    '<tr><td>Other towns</td><td>All other towns</td><td>KES 800</td><td>3-4 days</td></tr>' +
                  '</tbody>' +
                '</table>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<aside class="contact-side-column">' +
            '<div class="contact-info-card contact-modern-card contact-sticky-card">' +
              '<div class="contact-card-head"><span>Get in touch</span><h2>Contact details</h2></div>' +
              '<div class="contact-list">' +
                renderContactItem('WhatsApp', '+254 710 707 973', 'https://wa.me/254710707973') +
                renderContactItem('Phone', '+254 710 707 973', 'tel:+254710707973') +
                renderContactItem('Location', 'Commerce House, Moi Avenue, Nairobi', 'https://www.google.com/maps/search/?api=1&query=Commerce+House,+Moi+Avenue,+Nairobi') +
                '<div class="contact-list-item"><span>Hours</span><strong>Mon-Sat: 8am-8pm</strong></div>' +
              '</div>' +
            '</div>' +
            '<div class="contact-info-card contact-modern-card">' +
              '<div class="contact-card-head"><span>Visit us</span><h2>Find the store</h2></div>' +
              '<div class="contact-map-wrap"><iframe src="https://maps.google.com/maps?q=Commerce+House+Moi+Avenue+Nairobi&t=&z=15&ie=UTF8&iwloc=&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>' +
              '<a class="contact-map-link" href="https://www.google.com/maps/search/?api=1&query=Commerce+House,+Moi+Avenue,+Nairobi" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>' +
            '</div>' +
            '<div class="contact-info-card contact-modern-card">' +
              '<div class="contact-card-head"><span>Social</span><h2>Follow Majestic</h2></div>' +
              '<div class="social-link-grid">' +
                '<a href="https://www.instagram.com/majesticgamesworld" target="_blank" rel="noopener noreferrer">Instagram<span>@majesticgamesworld</span></a>' +
                '<a href="https://tiktok.com/@majesticgamesworld" target="_blank" rel="noopener noreferrer">TikTok<span>@majesticgamesworld</span></a>' +
                '<a href="https://www.facebook.com/share/1859yTLwx3/" target="_blank" rel="noopener noreferrer">Facebook<span>Majestic Games World</span></a>' +
              '</div>' +
            '</div>' +
            '<div class="contact-help-card">' +
              '<h2>Not sure what to buy?</h2>' +
              '<p>Tell us the age, group size, budget, and occasion. We will suggest games that fit.</p>' +
              '<a href="https://wa.me/254710707973?text=Hi%20Majestic%20Games%20World!%20Please%20recommend%20a%20game%20for%20me." target="_blank" rel="noopener noreferrer">Ask for a recommendation</a>' +
            '</div>' +
          '</aside>' +
        '</div>' +
      '</div>' +
    '</section>';

  renderContactDelivery();
}

function renderInfoPage(pageId) {
  var data = INFO_PAGES[pageId];
  if (!data) return;

  var page = document.getElementById('page-' + pageId);
  if (!page) {
    page = document.createElement('div');
    page.id = 'page-' + pageId;
    page.className = 'page';
    var footer = document.querySelector('.site-footer');
    if (footer && footer.parentNode) footer.parentNode.insertBefore(page, footer);
    else document.body.appendChild(page);
  }

  page.innerHTML =
    '<section class="info-hero">' +
      '<div class="container">' +
        '<div class="breadcrumb">' +
          '<a href="#" onclick="navigate(\'home\')">Home</a>' +
          '<span>&#8250;</span>' +
          '<span>' + escHtml(data.title) + '</span>' +
        '</div>' +
        '<span class="hero-kicker">' + escHtml(data.kicker) + '</span>' +
        '<h1 class="page-header-title">' + escHtml(data.title) + '</h1>' +
        '<p class="page-header-sub">' + escHtml(data.intro) + '</p>' +
      '</div>' +
    '</section>' +
    '<section class="info-section">' +
      '<div class="container">' +
        '<div class="info-layout">' +
          '<aside class="info-sidebar">' +
            '<span>Majestic Guide</span>' +
            '<a href="' + getRouteUrl('faqs') + '" onclick="event.preventDefault();navigate(\'faqs\')">FAQs</a>' +
            '<a href="' + getRouteUrl('privacy-policy') + '" onclick="event.preventDefault();navigate(\'privacy-policy\')">Privacy Policy</a>' +
            '<a href="' + getRouteUrl('refund-return-policy') + '" onclick="event.preventDefault();navigate(\'refund-return-policy\')">Refund & Return Policy</a>' +
            '<a href="' + getRouteUrl('terms-conditions') + '" onclick="event.preventDefault();navigate(\'terms-conditions\')">Terms & Conditions</a>' +
            '<a href="' + getRouteUrl('blog') + '" onclick="event.preventDefault();navigate(\'blog\')">Blog</a>' +
          '</aside>' +
          '<div class="info-content">' +
            data.sections.map(function(section) {
              return '<article class="info-card">' +
                '<h2>' + escHtml(section.title) + '</h2>' +
                section.body.map(function(paragraph) {
                  return '<p>' + escHtml(paragraph) + '</p>';
                }).join('') +
              '</article>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>' +
    '</section>';
}

function renderDeliveryOption(title, meta, copy) {
  return '<div class="delivery-option-card"><span>' + title + '</span><strong>' + meta + '</strong><p>' + copy + '</p></div>';
}

function renderContactItem(label, value, href) {
  var target = href.indexOf('http') === 0 ? ' target="_blank" rel="noopener noreferrer"' : '';
  return '<a class="contact-list-item" href="' + href + '"' + target + '><span>' + label + '</span><strong>' + value + '</strong></a>';
}

function renderContactDelivery() {
  var el = document.getElementById('contact-delivery-zones-nairobi');
  if (!el) return;
  
  var zones = DELIVERY_ZONES.slice(0, 5);
  var colors = ['#FF4D2E','#FF6B35','#FF8C42','#2EBFB0','#7C3AED'];
  
  el.innerHTML = zones.map(function(zone, i) {
    var color = colors[i % colors.length];
    var areas = zone.areas.split(',').map(function(a) { return a.trim(); });
    return '<div style="border-radius:16px;overflow:hidden;border:2px solid #111;box-shadow:3px 3px 0 #111">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:' + color + ';color:white">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<span style="background:rgba(255,255,255,0.25);padding:4px 12px;border-radius:20px;font-weight:700;font-size:0.75rem">Zone ' + String.fromCharCode(65+i) + '</span>' +
          '<span style="font-weight:600;font-size:0.95rem">' + zone.label.split('-')[0].trim() + '</span>' +
        '</div>' +
        '<span style="font-weight:800;font-size:1.1rem">KES ' + zone.fee + '</span>' +
      '</div>' +
      '<div style="padding:14px;font-size:0.8rem;color:#475569;line-height:1.6">' + 
        '<div style="font-weight:600;color:#111;margin-bottom:8px">Areas:</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px">' + 
          areas.map(function(area) { 
            return '<span style="background:#f3f4f6;border:1px solid #e5e7eb;padding:4px 10px;border-radius:20px;font-size:0.75rem;color:#374151">' + area + '</span>'; 
          }).join('') + 
        '</div>' +
      '</div>' +
      '<div style="padding:10px 16px;background:#111;color:white;border-top:2px solid #111;font-size:0.75rem;font-weight:600">Delivery: ' + zone.time + '</div>' +
    '</div>';
  }).join('');
}

/* ─────────────────────────────────────────────
   FOOTER
───────────────────────────────────────────── */
function initFooter() {
  var footer = document.querySelector('.site-footer');
  if (footer) {
    footer.innerHTML =
      '<div class="footer-wave-top" aria-hidden="true"></div>' +
      '<div class="footer-curvy-main">' +
        '<div class="footer-orbit" aria-hidden="true"><span></span><span></span><span></span></div>' +
        '<div class="footer-curvy-inner">' +
          '<section class="footer-brand-panel" aria-label="Majestic Games footer">' +
            '<a href="#" class="footer-logo-mark" onclick="navigate(\'home\')" aria-label="Back to Majestic Games home">' +
              '<img src="' + LOGO_TRANSPARENT_SRC + '" alt="Majestic Games & Toys World" loading="lazy" />' +
            '</a>' +
             '<div class="footer-brand-copy">' +
              '<div class="footer-brand-text">' +
                '<h2>play better <span class="footer-highlight">shop smarter</span></h2>' +
              '</div>' +
              '<div class="footer-right-section">' +
                '<div class="footer-socials" aria-label="Social links">' +
                  '<a href="https://www.instagram.com/majesticgamesworld" target="_blank" rel="noopener noreferrer" class="footer-social-link instagram" aria-label="Instagram">' +
                    '<img src="' + BRANDING_ASSET_BASE + 'instagram.png" alt="Instagram" loading="lazy" />' +
                    '<span class="social-tooltip">Instagram</span>' +
                  '</a>' +
                  '<a href="https://tiktok.com/@majesticgamesworld" target="_blank" rel="noopener noreferrer" class="footer-social-link tiktok" aria-label="TikTok">' +
                    '<img src="' + BRANDING_ASSET_BASE + 'tiktok.png" alt="TikTok" loading="lazy" />' +
                    '<span class="social-tooltip">TikTok</span>' +
                  '</a>' +
                  '<a href="https://www.facebook.com/share/1859yTLwx3/" target="_blank" rel="noopener noreferrer" class="footer-social-link facebook" aria-label="Facebook">' +
                    '<img src="' + BRANDING_ASSET_BASE + 'facebook.png" alt="Facebook" loading="lazy" />' +
                    '<span class="social-tooltip">Facebook</span>' +
                  '</a>' +
                  '<a href="https://wa.me/254710707973" target="_blank" rel="noopener noreferrer" class="footer-social-link whatsapp" aria-label="WhatsApp">' +
                    '<img src="' + BRANDING_ASSET_BASE + 'whatsapp.png" alt="WhatsApp" loading="lazy" />' +
                    '<span class="social-tooltip">WhatsApp</span>' +
                  '</a>' +
                '</div>' +
                '<div class="footer-contact-info">' +
                  '<span class="footer-get-in-touch">Get in Touch: 0748472002 | 0710707973</span>' +
                '</div>' +
              '</div>' +
             '</div>' +
           '</section>' +
           '<div class="footer-ribbon">' +
             '<nav class="footer-policy-nav" aria-label="Footer pages">' +
               '<a href="' + getRouteUrl('faqs') + '" onclick="event.preventDefault();navigate(\'faqs\')">FAQs</a>' +
               '<span class="footer-pipe"> | </span>' +
               '<a href="' + getRouteUrl('blog') + '" onclick="event.preventDefault();navigate(\'blog\')">Blog</a>' +
               '<span class="footer-pipe"> | </span>' +
               '<a href="' + getRouteUrl('privacy-policy') + '" onclick="event.preventDefault();navigate(\'privacy-policy\')">Privacy Policy</a>' +
               '<span class="footer-pipe"> | </span>' +
               '<a href="' + getRouteUrl('refund-return-policy') + '" onclick="event.preventDefault();navigate(\'refund-return-policy\')">Refund &amp; Return Policy</a>' +
               '<span class="footer-pipe"> | </span>' +
               '<a href="' + getRouteUrl('terms-conditions') + '" onclick="event.preventDefault();navigate(\'terms-conditions\')">Terms &amp; Conditions</a>' +
             '</nav>' +
           '</div>' +
           '<div class="footer-bottom-inner">' +
             '<p class="footer-copyright" id="footer-copyright"></p>' +
             '<div class="footer-accept">' +
               '<span>Secure checkout</span>' +
               '<span class="payment-chip mpesa">M-Pesa</span>' +
               '<span class="payment-chip mastercard"><i></i><b></b></span>' +
               '<span class="payment-chip visa">VISA</span>' +
               '<span class="payment-chip paypal">PayPal</span>' +
             '</div>' +
           '</div>' +
         '</div>' +
       '</div>';
  }

  var linksEl = document.getElementById('footer-shop-links');
  if (linksEl) {
    linksEl.innerHTML = CATEGORIES.slice(0, 8).map(function(cat) {
      return '<a href="#" class="footer-link" onclick="navigate(\'category\',\'' + cat.id + '\')">' +
        '<span>&#8250;</span> ' + cat.label +
      '</a>';
    }).join('') + '<a href="#" class="footer-link footer-link-strong" onclick="navigate(\'shop\')"><span>&#128717;</span> All Products</a>';
  }

  // Copyright
  var copyrightEl = document.getElementById('footer-copyright');
  if (copyrightEl) {
    copyrightEl.textContent = 'Copyright ' + new Date().getFullYear() + ' Majestic Games & Toys World. All rights reserved.';
  }
}

/* ─────────────────────────────────────────────
   NEWSLETTER
───────────────────────────────────────────── */
function handleNewsletter(event) {
  event.preventDefault();
  var email = document.getElementById('newsletter-email');
  if (!email || !email.value) return;
  showToast('Subscribed!', 'Thanks for joining our newsletter.', '🎉');
  email.value = '';
}

/* ─────────────────────────────────────────────
   TOAST NOTIFICATIONS
───────────────────────────────────────────── */
function showToast(title, desc, icon) {
  var container = document.getElementById('toast-container');
  if (!container) return;

  var toast = document.createElement('div');
  toast.className = 'toast success';
  toast.innerHTML =
    '<span class="toast-icon">' + (icon || '✅') + '</span>' +
    '<div class="toast-body">' +
      '<div class="toast-title">' + escHtml(title) + '</div>' +
      (desc ? '<div class="toast-desc">' + escHtml(desc) + '</div>' : '') +
    '</div>';

  container.appendChild(toast);

  setTimeout(function() {
    toast.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  }, 3000);
}

/* ─────────────────────────────────────────────
   CONFETTI BURST
───────────────────────────────────────────── */
var confettiColors = ['#e8521a','#2ebfb0','#d4a843','#c9a14c','#4a1211','#25D366'];

function confettiBurst() {
  for (var i = 0; i < 12; i++) {
    (function(i) {
      setTimeout(function() {
        var piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + 'vw';
        piece.style.top = '-10px';
        piece.style.background = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        piece.style.animationDuration = (1.5 + Math.random()) + 's';
        piece.style.animationDelay = (Math.random() * 0.3) + 's';
        document.body.appendChild(piece);
        setTimeout(function() { if (piece.parentNode) piece.parentNode.removeChild(piece); }, 2500);
      }, i * 50);
    })(i);
  }
}

/* ─────────────────────────────────────────────
   HEADER SCROLL EFFECT
───────────────────────────────────────────── */
function initHeaderScroll() {
  window.addEventListener('scroll', function() {
    var header = document.getElementById('site-header');
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 20);
    var menu = document.getElementById('shop-dropdown-menu');
    if (menu && menu.classList.contains('open')) positionSmartShopMenu();
  }, { passive: true });
  window.addEventListener('resize', function() {
    var menu = document.getElementById('shop-dropdown-menu');
    if (menu && menu.classList.contains('open')) positionSmartShopMenu();
  }, { passive: true });
}

/* ─────────────────────────────────────────────
   CLOSE DROPDOWNS ON OUTSIDE CLICK
───────────────────────────────────────────── */
function initOutsideClickHandlers() {
  document.addEventListener('click', function(e) {
    // Shop dropdown
    var dropdown = document.getElementById('shop-dropdown');
    if (dropdown && !dropdown.contains(e.target)) closeShopDropdown();

    // Search panel
    var searchContainer = document.getElementById('search-container');
    if (searchContainer && !searchContainer.contains(e.target)) closeSearch();
  });

  // ESC key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeSearch();
      closeShopDropdown(true);
      closeMobileNav(true);
      closeCart();
      closeQuickView();
      closeImageZoom();
    }
  });
}

/* ─────────────────────────────────────────────
   UTILITY
───────────────────────────────────────────── */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─────────────────────────────────────────────
    INIT — runs on DOMContentLoaded
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('click', function(event) {
    var link = event.target.closest && event.target.closest('a[href="#"]');
    if (link) event.preventDefault();
  }, true);

  captureSiteHeaderTemplate();

  // Load persisted cart if valid
  loadCart();
  loadWishlist();
  updateCartUI();

  // Init dark mode (check saved preference)
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  function toggleDarkMode() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }
    updateDarkModeIcon();
  }
  window.toggleDarkMode = toggleDarkMode;

  function updateDarkModeIcon() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var icon = document.getElementById('dark-mode-icon');
    if (icon) {
      if (isDark) {
        icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
      } else {
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
      }
    }
  }
  updateDarkModeIcon();

  // Initialize all components
  initTopBanner();
  initHero();
  renderHomePage();
  initGameFinder();
  initShopDropdown();
  initMobileNav();
  initSearch();
  initFooter();
  initHeaderScroll();
  initOutsideClickHandlers();
  initShopPage();

  // Restore direct product/category/page URLs such as ?product=azul.
  var initialRoute = getRouteFromLocation();
  navigate(initialRoute.page, initialRoute.param, true);
  var prettyRoute = new URLSearchParams(window.location.search || '').get('pretty');
  if (prettyRoute && initialRoute.page === prettyRoute && window.history && window.history.replaceState) {
    window.history.replaceState({ page: initialRoute.page, param: initialRoute.param || null }, '', getRouteUrl(initialRoute.page, initialRoute.param));
  }

  // Handle browser back/forward (history management)
  var pageHistory = [{ page: 'home', param: null }];

  window.addEventListener('hashchange', function() {
    var route = getRouteFromLocation();
    navigate(route.page, route.param);
  });

  window.addEventListener('popstate', function(e) {
    if (e.state && e.state.page) {
      navigate(e.state.page, e.state.param, true);
    } else {
      var route = getRouteFromLocation();
      navigate(route.page, route.param, true);
    }
  });

  function navigateWithHistory(page, param) {
    if (currentPage !== page || currentCategory !== param) {
      pageHistory.push({ page: page, param: param });
      window.history.pushState({ page: page, param: param }, '', getRouteUrl(page, param));
    }
    navigate(page, param);
  }

  console.log('%c🎲 Majestic Games & Toys World', 'color:#e8521a;font-size:1.2rem;font-weight:bold');
  console.log('%c' + PRODUCTS.length + ' products loaded', 'color:#2ebfb0;font-size:0.9rem');
});
