import re

with open("pages/Payment.tsx", "r") as f:
    content = f.read()

old_submit = """        await updateDoc(doc(db, "orders", orderId as string), {
          courierSenderNumber: senderNumber.trim(),
          courierTrxId: trxId.trim(),
          courierPaymentStatus: "checking"
        });"""

new_submit = """        await updateDoc(doc(db, "orders", orderId as string), {
          courierPaymentDetails: {
            amount: amountToPay,
            senderNumber: senderNumber.trim(),
            trxId: trxId.trim()
          },
          courierPaymentStatus: "checking"
        });"""

content = content.replace(old_submit, new_submit)

with open("pages/Payment.tsx", "w") as f:
    f.write(content)
