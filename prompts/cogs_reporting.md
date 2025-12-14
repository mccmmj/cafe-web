# COGS reporting
## Inventory Managment Issues
 - The sync-square-sales does not appear
   For example, I want to be able to delete everything and re-enter a new value
 - No calculator option for computing unit costs.  For example, if adding an inventory
   item that is a package of 12 for $24, the unit cost is $24/12=$2.00 
 - When entering a new iventory item and selecting pre-packaged, the item saves as ingredient
## Create Purchase Order Modal
 - It would be nice to be able to collapse/expand the "Quick Add Items" control
 - On "Add Item" control, quantity should be pre-filled with configured reorder quantity
 - After a purchase is approved, if an orer item is found to be out-of-stock during the submission
   phase, it should be possible to mark the item as out-of-stock and thus not sent to the supplier.
## General
 - There is no capability for removing inventory items
 - For efficiency purposes, need to be able to create new purchase orders by duplicating & modifing
   past purchase orders
 - When an invoice is mistakenly uploaded on a purchase order and then unlinked, the app 
   fails to accept additional updloads saying an invoice already exists for the purchase order.
 - The Purchase Orders tab on the /admin/inventory page is not responsive. It presents a 
   horizontal scrollbar as soon as the browser window is narrowed.  the actions should be 
   condensed to vertical dots to allow for selection.
 - Need to be easily able to update the unit cost of items.  Admin users should be apble to 
   view the unit cost history.  Admin users should be able to update orders during purchase
   order workflow processing. This is especially importing for computing cost-of-goods-sold (COGS).
 - For creating purchase orders, the app needs to distinquish between singular pre-packaged 
   items on the menu versus how the items are ordered. For example, most of the items ordered
   from suppliers are packaged into cases of multiple items.  The purchase order modal should
   allow for ordering a single item that is a package of, say, 24 prepackaged menu items.  It should 
   know that the single package item could account for the addition of 24 items to inventory.
   Currently, it is necessary to associate each order item to square item id unless the item
   is an ingredient. We still need this association for packaged items, but the app should know
   that the single packaged item amounts to the addition of, say, 24 items to the inventory.
 - The app needs to provide feedback on the success/failure of purchase orders sent by email.
   We are currently using the RESEND service for email.  It may be necessary to change the 
   smtp service to eanble better feedback. This could be accomplished by use of the internal
   smtp email service provided by supabase.
