# Inventory management issues
## General
 - After initially creating a purchase order, the total is not updated when items are later added
 - From the /admin/invoices page, the ReviewMatches modal does not match the PO#.  This could be 
   related/introduced from a recent change allowing multiple invoices per PO.  This change introduced
   the addition of "-1", "-2" to the PO#.
 - On Stock Overview tab, when keyword search is filled, the is no [x] option in the input box
   capable of clearing the input.
 - Since packaged inventory items are almost always paired with non-packaged/individual items
   having the same square variation id, current stock of the packaged items should be fixed 
   at 0 and be uneditable and unadjustable.  When packaged items that are paired with non-packaged
   items are recieved, it should only update the stock of the paired non-packaged item.
 - When using the Email modal for sending a PO to the supplier, the expected delivery date 
   appears one day prior from the actual expected delivery data inputed on the PO.
 - When using the Email modal for sending a PO to the supplier, there is no feedback from
   submit.  There should be a toast message indicating the email was transferred either 
   successfully or unsecessfully with the smtp client/api even if this doesn't guarantee delivery.



