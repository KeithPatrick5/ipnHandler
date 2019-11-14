const { sendToken } = require("../slp/send-token");
const table = process.env.AWS_DYNAMODB_TABLE;
const { getInvoice } = require("../bitpay/getInvoice");

// ipn POST handler
// https://bitpay.com/docs/invoice-callbacks
module.exports = async function(app, db) {
  app.post("/", async (req, res) => {
    console.log("**********");
    console.log(" [x] routes:: Notification orderId: ", req.body.orderId);
    console.log(" [x] routes:: BitPay id: ", req.body.id);
    console.log(" [x] routes:: BitPay status: ", req.body.status);

    let statusChecked;

    // 2 check invoice - https://bitpay.com/docs/invoice-states
    try {
      let checkInvoice = await getInvoice(req.body.id);
      statusChecked = checkInvoice.data.data.status;
      console.log(" [x] routes:: getInvoice ", checkInvoice.data);
      console.log(" [x] routes:: checking invoiceId status: ", statusChecked);
    } catch (err) {
      console.log(" [*] routes:: ERROR at getInvoice : ", err);
    }

    // 3 get orderId form db
    const params = {
      TableName: table,
      Key: {
        id: req.body.orderId
      }
    };
    let order = await db.get(params);
    order = order.Item;
    console.log(" [x] ***order :****\n ", order);
    // 4 update order in db
    let updatedParams = {
      TableName: table,
      Key: {
        id: req.body.orderId
      },
      UpdateExpression: "set #st = :s, #bi = :b",
      ExpressionAttributeValues: {
        ":s": req.body.status,
        ":b": req.body
      },
      ExpressionAttributeNames: {
        "#st": "status",
        "#bi": "bitpayInvoice"
      },
      ReturnValues: "UPDATED_NEW"
    };
    try {
      await db.update(updatedParams);
      console.log(" [x] routes:: updated data: ", updatedParams);
    } catch (err) {
      console.log(" [*] routes:: ERROR in DynamoDB: ", err);
    }
    console.log('statusChecked: ',statusChecked)
    // 5 create SLP transaction
    if (statusChecked === "confirmed" || "completed") {
      console.log(
        " [x] routes:: create SLP transaction. To address: ",
        order.SLPaddress
      );
      let trx;

      try {
        trx = await sendToken(order.amount, order.SLPaddress);
        console.log(
          ` [x] routes:: SLP transaction success ${order.amount} honk to ${order.SLPaddress}`
        );
      } catch (err) {
        console.log(
          ` [*] routes:: ERROR SLP transaction failed ${order.amount} honk to ${order.SLPaddress} ${err}`
        );
        throw err;
      }

      // 6 save SLP transaction result to DB
      updatedParams = {
        TableName: table,
        Key: {
          id: req.body.orderId
        },
        UpdateExpression: "set slpTransactionId = :s",
        ExpressionAttributeValues: {
          ":s": trx
        },
        ReturnValues: "UPDATED_NEW"
      };
      try {
        await db.update(updatedParams);
        console.log(" [x] routes:: updated data: ", updatedParams);
      } catch (err) {
        console.log(" [*] routes:: ERROR in DynamoDB: ", err);
      }
    }

    // 1  Status 200 send back to BitPay
    res.sendStatus(200);
  });
};
