import DailyPurchase from "../models/daily-purchase.model.js";
import User from "../models/user.model.js";

// Add/Update daily milk purchase
export const addDailyPurchase = async (req, res) => {
  try {
    const { litres, date, frequency } = req.body;
    const customerId = req.user._id;
    const milkmanId = req.user.milkmanId;

    if (!milkmanId) {
      return res.status(400).json({ message: "Customer not linked to a milkman" });
    }

    // Fetch milkman to get current price
    const milkman = await User.findById(milkmanId);
    if (!milkman || milkman.role !== "milkman" || !milkman.pricePerLitre) {
      return res.status(400).json({ message: "Milkman price not set" });
    }

    const pricePerLitre = milkman.pricePerLitre;
    const totalAmount = litres * pricePerLitre;
    const purchaseDate = date ? new Date(date).setHours(0, 0, 0, 0) : new Date().setHours(0, 0, 0, 0);

    // Validate frequency (15 or 30)
    const freq = frequency ? Number(frequency) : 15;
    if (![15, 30].includes(freq)) {
      return res.status(400).json({ message: "Invalid frequency; must be 15 or 30" });
    }

    // Compute dueDate as purchaseDate + frequency days
    const dueDate = new Date(purchaseDate);
    dueDate.setDate(dueDate.getDate() + freq);

    // Check if purchase already exists for this date
    let purchase = await DailyPurchase.findOne({
      customerId,
      milkmanId,
      date: purchaseDate,
    });

    if (purchase) {
      // Update existing purchase
      purchase.litres = litres;
      purchase.pricePerLitre = pricePerLitre;
      purchase.totalAmount = totalAmount;
      purchase.frequency = freq;
      purchase.dueDate = dueDate;
      await purchase.save();
    } else {
      // Create new purchase
      purchase = await DailyPurchase.create({
        customerId,
        milkmanId,
        litres,
        pricePerLitre,
        totalAmount,
        frequency: freq,
        dueDate,
        date: purchaseDate,
      });
    }

    res.status(201).json({
      message: "Purchase recorded successfully",
      purchase,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get customer purchase history
export const getCustomerPurchases = async (req, res) => {
  try {
    const customerId = req.user._id;

    const purchases = await DailyPurchase.find({ customerId })
      .populate("milkmanId", "name phone pricePerLitre")
      .sort({ date: -1 });

    const totalUnpaid = purchases
      .filter((p) => !p.isPaid)
      .reduce((sum, p) => sum + p.totalAmount, 0);

    res.json({
      purchases,
      totalUnpaid,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get milkman's customers purchases (for milkman dashboard)
export const getMilkmanCustomerPurchases = async (req, res) => {
  try {
    const milkmanId = req.user._id;

    const purchases = await DailyPurchase.find({ milkmanId })
      .populate("customerId", "name phone")
      .sort({ date: -1 });

    // Group by customer
    const byCustomer = {};
    purchases.forEach((p) => {
      if (!byCustomer[p.customerId._id]) {
        byCustomer[p.customerId._id] = {
          customer: p.customerId,
          totalAmount: 0,
          totalUnpaid: 0,
          purchases: [],
        };
      }
      byCustomer[p.customerId._id].totalAmount += p.totalAmount;
      if (!p.isPaid) {
        byCustomer[p.customerId._id].totalUnpaid += p.totalAmount;
      }
      byCustomer[p.customerId._id].purchases.push(p);
    });

    res.json({
      customers: Object.values(byCustomer),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mark purchase as paid
export const markPurchasePaid = async (req, res) => {
  try {
    const { purchaseId } = req.params;

    const purchase = await DailyPurchase.findByIdAndUpdate(
      purchaseId,
      { isPaid: true },
      { new: true }
    );

    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    res.json({
      message: "Purchase marked as paid",
      purchase,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
