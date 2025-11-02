# 📐 ROP Formula Quick Reference Card

## 🎯 Core Formula

```
ROP = (Average Daily Demand × Lead Time in Days) + Safety Stock
```

## 📊 Component Breakdown

### 1. Average Daily Demand (ADD)
**How it's calculated:**
```javascript
// From sales history (last 30 days by default)
Total Units Sold in Period ÷ Number of Days in Period

// Example:
// 90 units sold in 30 days = 3 units/day
```

**Data Source:**
- Primary: `product.salesHistory` or `variant.salesHistory`
- Fallback: Default 10 units/day if no history

**Code Location:**
```javascript
// inventoryCalculations.js → estimateDemand()
const averageDemand = totalSales / salesDays;
```

---

### 2. Lead Time (LT)
**Definition:** Days between placing order and receiving stock

**Data Source Priority:**
1. `variant.leadTime`
2. `product.supplier.leadTime`
3. `product.suppliers[0].leadTime`
4. `product.leadTime`
5. Default: 7 days

**Code Location:**
```javascript
// Pos_NewSale.jsx → checkRestockingThreshold()
let leadTimeDays = variant.leadTime || 
                   productData.supplier?.leadTime || 
                   productData.suppliers?.[0]?.leadTime || 
                   productData.leadTime || 7;
```

---

### 3. Safety Stock (SS)
**Definition:** Buffer inventory to handle demand variability

**Recommended Values:**
- **High Demand Variability:** 20-30% of average monthly demand
- **Medium Variability:** 10-20% of average monthly demand
- **Consistent Demand:** 5-10% of average monthly demand

**Data Source:**
- `product.safetyStock` or `variant.safetyStock`
- Default: 0 (not recommended)

**Advanced Formula (Optional):**
```
Safety Stock = Z × σ × √L

Where:
  Z = Service level factor (1.65 for 95% service level)
  σ = Standard deviation of daily demand
  L = Lead time in days
```

---

## 🧮 Complete Example

### Scenario: Steel Rebar 10mm × 6m

**Given Data:**
- Sales Last 30 Days: 105 units (12 transactions)
- Supplier Lead Time: 14 days
- Safety Stock: 10 units
- Current Stock: 45 units

**Step-by-Step Calculation:**

```
Step 1: Calculate Average Daily Demand
ADD = 105 units ÷ 30 days = 3.5 units/day

Step 2: Calculate Lead Time Demand
LTD = 3.5 units/day × 14 days = 49 units

Step 3: Add Safety Stock
ROP = 49 + 10 = 59 units

Result: Reorder when stock reaches 59 units
```

**System Behavior:**
- ✅ Stock = 60 units → No alert (above ROP)
- ⚠️ Stock = 59 units → Restocking alert (at ROP)
- 🚨 Stock = 30 units → Critical alert (50% below ROP)
- ⛔ Stock = 0 units → Out of stock (immediate action)

---

## 📈 Priority Levels

The system automatically assigns priority based on current stock vs ROP:

```javascript
if (currentQty === 0) 
  → priority: "critical" ⛔

else if (currentQty <= ROP × 0.5) 
  → priority: "urgent" 🚨

else if (currentQty <= ROP) 
  → priority: "high" ⚠️

else if (currentQty <= ROP × 1.5) 
  → priority: "medium" 📊

else 
  → priority: "normal" ✅
```

---

## 🔍 Real-World Examples

### Example 1: Fast-Moving Product
```
Product: Cement 50kg bags
Sales History: 300 bags in 30 days
Average Daily Demand: 10 bags/day
Lead Time: 7 days
Safety Stock: 20 bags (20% of monthly avg)

ROP = (10 × 7) + 20 = 90 bags

Interpretation:
- Reorder when stock hits 90 bags
- Order arrives in 7 days (uses 70 bags)
- Safety stock (20 bags) handles demand spikes
```

### Example 2: Slow-Moving Product
```
Product: Specialty Paint (5L)
Sales History: 15 cans in 30 days
Average Daily Demand: 0.5 cans/day
Lead Time: 21 days (imported)
Safety Stock: 5 cans

ROP = (0.5 × 21) + 5 = 15.5 → 16 cans

Interpretation:
- Reorder when stock hits 16 cans
- Long lead time requires earlier reorder
- Higher safety stock % due to low volume
```

### Example 3: Seasonal Product
```
Product: Roofing Sheets (Rainy Season)
Sales History (June): 200 sheets in 30 days
Average Daily Demand: 6.67 sheets/day
Lead Time: 10 days
Safety Stock: 30 sheets (seasonal buffer)

ROP = (6.67 × 10) + 30 = 96.7 → 97 sheets

Note: Sales history adapts to season automatically
```

---

## 🎛️ Configuration Best Practices

### Setting Safety Stock

**Formula-Based Approach:**
```javascript
// For 95% service level
const Z = 1.65; // Z-score
const σ = standardDeviationOfDailyDemand;
const L = leadTimeDays;

safetyStock = Math.ceil(Z × σ × Math.sqrt(L));
```

**Rule-of-Thumb Approach:**
```javascript
// Simple method
const monthlyAverage = averageDailyDemand × 30;
safetyStock = Math.ceil(monthlyAverage × 0.15); // 15% of monthly
```

### Setting Lead Time

**Tips:**
- Include: ordering + processing + shipping + receiving time
- Add buffer for supplier reliability issues
- Update seasonally if shipping times vary
- Document in supplier records

### Maximum Stock Level

**Recommended Formula:**
```
Maximum = ROP + EOQ

Where EOQ = Economic Order Quantity
```

This ensures:
- Never overstocking beyond EOQ
- Efficient use of storage space
- Optimal capital allocation

---

## 📊 Monitoring Dashboard Metrics

### Key Indicators

**1. Stock Status**
```
Current Qty ÷ ROP × 100 = Stock %

> 150%  → Overstock
100-150% → Healthy
50-100%  → Monitor
< 50%    → Critical
```

**2. Demand Accuracy**
```
Actual Sales vs Predicted Demand

±5%  → Excellent forecasting
±10% → Good forecasting
±20% → Fair (review settings)
> 20% → Poor (adjust ROP)
```

**3. Stockout Risk**
```
Days Until Stockout = Current Qty ÷ Average Daily Demand

< Lead Time → Immediate reorder needed
```

---

## 🛠️ Troubleshooting Guide

### Problem: Alerts Too Frequent
**Symptoms:** Getting restocking alerts daily

**Possible Causes:**
- ROP set too high
- Safety stock excessive
- Lead time overestimated

**Solutions:**
```javascript
// Review settings
console.log({
  ROP: calculatedROP,
  breakdown: {
    avgDailyDemand: ADD,
    leadTime: LT,
    safetyStock: SS,
    formula: `(${ADD} × ${LT}) + ${SS} = ${ROP}`
  }
});

// Adjust if needed
safetyStock = Math.ceil(ADD × LT × 0.1); // 10% buffer
```

### Problem: Stockouts Still Occurring
**Symptoms:** Running out of stock despite ROP

**Possible Causes:**
- Lead time underestimated
- Demand spike not captured
- Safety stock too low

**Solutions:**
```javascript
// Increase safety stock
safetyStock = Math.ceil(ADD × LT × 0.2); // 20% buffer

// Or increase ROP multiplier
const adjustedROP = ROP × 1.2; // 20% buffer on ROP itself
```

### Problem: Default Values Used
**Symptoms:** Console shows "demandIsEstimated: true"

**Cause:** No sales history available

**Solution:**
```javascript
// Run backfill
import { backfillProductSalesHistory } from './services/SalesHistoryService';
await backfillProductSalesHistory(productRef, productData);

// Or wait for organic sales to accumulate
// System auto-populates after each sale
```

---

## 📖 Related Formulas

### Economic Order Quantity (EOQ)
```
EOQ = √((2 × Annual Demand × Ordering Cost) / Holding Cost)
```

### Suggested Order Quantity
```javascript
if (needsRestock) {
  const deficit = maximumStockLevel - currentQty;
  suggestedQty = Math.max(EOQ, deficit);
} else {
  suggestedQty = EOQ;
}
```

### Holding Cost (Annual)
```
Holding Cost = Unit Cost × Holding Rate (typically 20-30%)
```

---

## 🔗 Quick Links

**Code Files:**
- `inventoryCalculations.js` - Core formulas
- `Pos_NewSale.jsx` - ROP checking & sales tracking
- `SalesHistoryService.js` - Historical data management

**Documentation:**
- `ROP_SALES_HISTORY_FIX.md` - Implementation details
- `INVENTORY_ROP_EOQ_IMPLEMENTATION.md` - System overview
- `RESTOCKING_ALERT_SYSTEM.md` - Alert workflow

---

**Version:** 1.0.0  
**Last Updated:** November 2, 2025  
**Author:** Inventory Management System Team
