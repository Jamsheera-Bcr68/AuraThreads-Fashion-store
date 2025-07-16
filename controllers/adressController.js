const Address=require('../model/addressModel')
const statusCodes = require('../utils/statusCodes')
const statusMessages = require('../utils/statusMessages')
const mongoose=require('mongoose')

const addAddresses = async (req, res) => {
  const { label, line1, line2, city, state, zip, country, phone } = req.body;
  console.log(
    ` label is ${label} line1 is ${line1} line2 is ${line2} city is ${city} state is ${state} zip is ${zip} country is ${country} phone is ${phone}`,
  );
  const isDefault = req.body.isDefault || false;
  console.log(`is defsult is ${isDefault}`);

  try {
    const userId = req.session.user._id;
    console.log("user is ", userId);

    // If isDefault is true, update all other addresses to false for the same user
    if (isDefault) {
      await Address.updateMany({ userId }, { isDefault: false });
      const newAddress = new Address({
        userId,
        line1,
        line2,
        phone,
        city,
        state,
        zip,
        country,
        isDefault,
      });
      await newAddress.save();
      console.log("adress saved as default");
      res.redirect("/user/checkout");
    } else {
      const newAddress = new Address({
        userId,
        line1,
        line2,
        phone,
        city,
        state,
        zip,
        country,
        isDefault,
      });
      await newAddress.save();
      console.log("adress is saves as not default");
      res.redirect("/user/checkout");
    }
  } catch (error) {
    console.log("error in fetching adress", error);
    res.redirect("/user/checkout");
  }
};

//add address
const addAddress = async (req, res) => {
  console.log("from add adress");
  const { label, line1, line2, city, state, zip, country, phone } = req.body;
  console.log(
    ` label is ${label} line1 is ${line1} line2 is ${line2} city is ${city} state is ${state} zip is ${zip} country is ${country} phone is ${phone}`,
  );
  const isDefault = req.body.isDefault || false;
  console.log(`is defsult is ${isDefault}`);

  try {
    const userId = req.session.user._id;
    console.log("user is ", userId);
    const address = await Address.find({ userId })

    if (address.length == 4) {
      return res.status(statusCodes.BAD_REQUEST).json({ success: false, message: "You can only add 4 addresses" })
    }
    // If isDefault is true, update all other addresses to false for the same user
    if (isDefault) {
      await Address.updateMany({ userId }, { isDefault: false });
      const newAddress = new Address({
        userId,
        label,
        line1,
        line2,
        phone,
        city,
        state,
        zip,
        country,
        isDefault,
      });
      await newAddress.save();
      console.log("adress saved as default");

      return res.status(statusCodes.OK).json({ success: true, message: "New Address added successfully", address: newAddress });
    } else {
      const newAddress = new Address({
        label,
        userId,
        line1,
        line2,
        phone,
        city,
        state,
        zip,
        country,
        isDefault,
      });
      await newAddress.save();
      console.log("adress is saves as not default");
      return res.status(statusCodes.OK).json({ success: true, message: "Address added successfully" ,newAddress});
    }
  } catch (error) {
    console.log("error in fetching adress", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message:statusMessages.SERVER_ERROR });
  }
};

const editAddress = async (req, res) => {
  const addressId = req.params.editAddressId;
  console.log("address id is ", addressId);

  const { label, line1, line2, city, state, zip, country, phone } = req.body;
  console.log(`Address id is ${addressId} ant type is ${typeof addressId}`);
  console.log(
    ` label is ${label} line1 is ${line1} line2 is ${line2} city is ${city} state is ${state} zip is ${zip} country is ${country} phone is ${phone}`,
  );
  const isDefault = req.body.isDefault || false;
  console.log(`is defsult is ${isDefault}`);
  const userId = req.session.user._id;
  try {
    console.log("user id is ", userId);

    const address = await Address.findOne({
      _id: new mongoose.Types.ObjectId(addressId),
    });

    if (!address) {
      console.log("address not found");

      return res.status(statusCodes.NOT_FOUND).json({ success: false, message:statusMessages.NOT_FOUND("Address") });
    } else {
      console.log("address fount");
      if (isDefault) {
        await Address.updateMany({ userId }, { isDefault: false });
      }
      (address.label = label), (address.line1 = line1);
      address.line2 = line2;
      address.city = city;
      address.state = state;
      address.zip = zip;
      address.country = country;
      address.phone = phone;

      await address.save();
      console.log("adress saved successfully");
      return res.status(statusCodes.OK).json({ success: true,address, message:statusMessages.UPDATED('Address')});
    }
  } catch (error) {
    console.log(error);
    
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message:statusMessages.SERVER_ERROR });
  }
};

//delete address
const deleteAddress = async (req, res) => {
  console.log("from user delete adress");
  const addressId = req.params.addressId;
  console.log("addressid is"), addressId;

  try {
    const address = await Address.findOneAndDelete({ _id: addressId });
    if (!address) {
      console.log("address not fount");
      return res.json({ success: false, message: "Address not Found" });
    } else {
      console.log("account deleted success fully");
      return res.json({
        success: true,
        message: "Address Deleted Successfully",
      });
    }
  } catch (error) {
    console.log("error in fetching address", error);

    res.json({ success: false, message: "error in fetching address" });
  }
};
module.exports={
    addAddresses,
    addAddress,
    editAddress,
    deleteAddress
}