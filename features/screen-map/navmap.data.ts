/**
 * The app's navigation map for release 114 (release/1.5.1), read from the app's code — see navmap.ts for what it is and
 * tools/screen-map-nav-check.mjs for the check that keeps it whole. `controls` are the pictures' tappable controls as
 * the screenshot pipeline's bounds files list them (release/1.5.1 a6eddc161, kaam/screen-map/out/114); every one is
 * covered by a point. Brought from 113 on 2026-09-30 for decision 0199's renamed tap ids (and the 1.5.1 renames beside
 * them). The 30 screens that 114 pictures for the first time were read from the app's code on 2026-10-04 (release/1.5.1
 * 4ffe740c7): 23 are in the map, and 7 are pictured but nothing in the app opens them (`unreachable`, each with the code
 * that shows it). The pictures themselves are still the a6eddc161 package: Print, the PDF viewer and the later 1.5.1
 * changes appear here once the pictures are re-recorded.
 *
 * Generated from the code-derived inventory; edit a point here, then run `npm run check:screen-map-nav`.
 */
import type { NavMap } from "./navmap";

export const NAV: NavMap = {
 "versionCode": 114,
 "appBranch": "release/1.5.1",
 "root": "splash_scr",
 "screens": {
  "ad_dialog_shown": {
   "dataScreen": "ad_dialog_shown",
   "kind": "dialog",
   "parent": "saved_inv_scr",
   "pictured": true,
   "states": [
    "estimate",
    "invoice"
   ],
   "controls": [
    {
     "key": "ad_dialog_dismissed",
     "states": []
    },
    {
     "key": "watch_ad_click",
     "states": []
    },
    {
     "key": "ad_dailog_premium_click",
     "states": []
    }
   ],
   "points": [
    {
     "match": "ad_dialog_dismissed",
     "label": "Close (X)",
     "kind": "conditional",
     "branches": [
      {
       "when": "shown over Create Invoice (work kept as a draft, snackbar says so)",
       "to": "create_inv_scr",
       "back": true
      },
      {
       "when": "shown over Edit Invoice (edits kept)",
       "to": "edit_inv_scr",
       "back": true
      },
      {
       "when": "shown over the saved invoice (Send)",
       "to": "saved_inv_scr",
       "back": true
      },
      {
       "when": "estimate version (over Create Estimate)",
       "to": "create_estimate",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/components/AdOrPremiumDialog.kt:207",
     "events": [
      "ad_dialog_dismissed#close_button"
     ]
    },
    {
     "match": "watch_ad_click",
     "label": "Watch a Short Ad",
     "kind": "conditional",
     "branches": [
      {
       "when": "from Create/Edit Invoice; ad shows (after the ad the invoice is saved; validation failure stays on the editor)",
       "outside": "Interstitial ad",
       "to": "saved_inv_scr"
      },
      {
       "when": "from Create/Edit Invoice; no ad / timeout",
       "to": "saved_inv_scr"
      },
      {
       "when": "from the saved invoice (Send)",
       "outside": "Interstitial ad, then Share chooser",
       "to": "saved_inv_scr"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/components/AdOrPremiumDialog.kt:288"
    },
    {
     "match": "ad_dailog_premium_click",
     "label": "Go Premium",
     "kind": "forward",
     "to": "premium_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/components/AdOrPremiumDialog.kt:339"
    },
    {
     "match": "@system_back",
     "label": "Android back",
     "kind": "conditional",
     "branches": [
      {
       "when": "shown over Create Invoice (work kept as a draft, snackbar says so)",
       "to": "create_inv_scr",
       "back": true
      },
      {
       "when": "shown over Edit Invoice (edits kept)",
       "to": "edit_inv_scr",
       "back": true
      },
      {
       "when": "shown over the saved invoice (Send)",
       "to": "saved_inv_scr",
       "back": true
      },
      {
       "when": "estimate version (over Create Estimate)",
       "to": "create_estimate",
       "back": true
      },
      {
       "when": "ad is loading (back is ignored while loading)",
       "to": "ad_dialog_shown"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/components/AdOrPremiumDialog.kt:154"
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/components/AdOrPremiumDialog.kt:125"
  },
  "add_payment_scr": {
   "dataScreen": "add_payment_scr",
   "kind": "sheet",
   "parent": "create_inv_scr",
   "pictured": true,
   "states": [
    "form"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "label:$ · ALL",
     "states": []
    },
    {
     "key": "tap:add_payment_scr:PaymentInputSection.a_l_l_1",
     "states": []
    },
    {
     "key": "tap:add_payment_scr:TextFiedl.invotick_clickable_text_field_2",
     "states": []
    },
    {
     "key": "label:Select payment method",
     "states": []
    },
    {
     "key": "tap:add_payment_scr:PaymentMethodDropdown.select_payment_method_1",
     "states": []
    },
    {
     "key": "label:Invoice date",
     "states": []
    },
    {
     "key": "add_payment_success",
     "states": []
    },
    {
     "key": "add_payment_close",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36",
     "events": [
      "add_payment_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36",
     "events": [
      "add_payment_close#swipe"
     ]
    },
    {
     "match": "label:$ · ALL",
     "label": "Amount",
     "kind": "stay",
     "stay": "types the payment amount",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/payment/components/PaymentInputSection.kt"
    },
    {
     "match": "tap:add_payment_scr:PaymentInputSection.a_l_l_1",
     "label": "ALL",
     "kind": "stay",
     "stay": "fills the remaining balance as the amount",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/payment/components/PaymentInputSection.kt:134"
    },
    {
     "match": "re:^(tap:add_payment_scr:TextFiedl\\.invotick_clickable_text_field_2|label:Select\\ payment\\ method|tap:add_payment_scr:PaymentMethodDropdown\\.select_payment_method_1)$",
     "label": "Payment method",
     "kind": "stay",
     "stay": "opens the payment-method menu inline (a choice may open its details dialog)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/payment/components/PaymentMethodDropdown.kt:53"
    },
    {
     "match": "label:Invoice date",
     "label": "Payment date",
     "kind": "stay",
     "stay": "opens a date picker dialog",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/payment/PaymentBottomSheetScreen.kt:426"
    },
    {
     "match": "add_payment_success",
     "label": "Add Payment",
     "kind": "stay",
     "stay": "adds the payment to the list in this sheet (sheet stays open)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/payment/components/PaymentInputSection.kt:320"
    },
    {
     "match": "add_payment_close",
     "label": "Close (X) (payments applied)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/payment/PaymentBottomSheetScreen.kt:182"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:80",
     "events": [
      "add_payment_close#scrim_or_back"
     ]
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:67)"
  },
  "analytics_dashboard_scr": {
   "dataScreen": "analytics_dashboard_scr",
   "kind": "screen",
   "parent": "dashboard",
   "pictured": true,
   "states": [
    "default"
   ],
   "controls": [
    {
     "key": "tap:analytics_dashboard_scr:BusinessSelectionCard.business_selection_card_1",
     "states": []
    },
    {
     "key": "dashboard_screen_close",
     "states": []
    },
    {
     "key": "tap:analytics_dashboard_scr:DashboardScreen.refresh_1",
     "states": []
    },
    {
     "key": "label:Invoice",
     "states": []
    },
    {
     "key": "label:Estimate",
     "states": []
    },
    {
     "key": "label:Analytics",
     "states": []
    },
    {
     "key": "label:Ledgers",
     "states": []
    },
    {
     "key": "label:Tools",
     "states": []
    }
   ],
   "points": [
    {
     "match": "tap:analytics_dashboard_scr:BusinessSelectionCard.business_selection_card_1",
     "label": "Selected business card → business sheet",
     "kind": "forward",
     "to": "dashboard_business_sheet",
     "source": "feature/dashboard/src/commonMain/kotlin/invotick/invoicemaker/feature/dashboard/presentation/components/BusinessSelectionCard.kt:48; feature/dashboard/src/commonMain/kotlin/invotick/invoicemaker/feature/dashboard/presentation/DashboardScreen.kt:147,60"
    },
    {
     "match": "dashboard_screen_close",
     "label": "'Open menu' icon — actually goes to the Invoices graph start (does NOT open the drawer)",
     "kind": "conditional",
     "branches": [
      {
       "when": "normal launch",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "app was opened straight into a new invoice (first run) and the Invoices list is not underneath (graph start is Create Invoice)",
       "to": "create_inv_scr",
       "back": true
      }
     ],
     "source": "feature/dashboard/src/commonMain/kotlin/invotick/invoicemaker/feature/dashboard/presentation/DashboardScreen.kt:107-112; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:590-594"
    },
    {
     "match": "tap:analytics_dashboard_scr:DashboardScreen.refresh_1",
     "label": "Refresh",
     "kind": "stay",
     "stay": "Reloads the dashboard numbers",
     "source": "feature/dashboard/src/commonMain/kotlin/invotick/invoicemaker/feature/dashboard/presentation/DashboardScreen.kt:116"
    },
    {
     "match": "label:Invoice",
     "label": "Invoice tab",
     "kind": "forward",
     "to": "dashboard",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:978 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "label:Estimate",
     "label": "Estimate tab",
     "kind": "forward",
     "to": "estimate_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:993 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "label:Analytics",
     "label": "Analytics tab (already here)",
     "kind": "stay",
     "stay": "Current tab: handleBottomNavigation returns without navigating",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:969"
    },
    {
     "match": "label:Ledgers",
     "label": "Ledgers tab",
     "kind": "forward",
     "to": "client_ledger_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:1001 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "label:Tools",
     "label": "Tools tab",
     "kind": "forward",
     "to": "tools_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:1009 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "@system_back",
     "label": "Android back (pops the tab)",
     "kind": "conditional",
     "branches": [
      {
       "when": "normal case: tabs are pushed over the Invoices list",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "app was opened straight into a new invoice (first run) and the Invoices list is not underneath",
       "to": "create_inv_scr",
       "back": true
      }
     ],
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:970-976 (no BackHandler; NavHost pops)"
    }
   ],
   "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:587; feature/dashboard/src/commonMain/kotlin/invotick/invoicemaker/feature/dashboard/navigation/DashboardNavigation.kt:22"
  },
  "business_add_form_landed": {
   "dataScreen": "business_add_form_landed",
   "kind": "sheet",
   "parent": "create_inv_scr",
   "pictured": true,
   "states": [
    "form-empty",
    "form-filled",
    "list"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "add_business_select_logo_click",
     "states": [
      "form-empty",
      "form-filled"
     ]
    },
    {
     "key": "label:Business Name · Name · Enter your legal business name as registered",
     "states": [
      "form-empty"
     ]
    },
    {
     "key": "business_show_more_detail_clicked",
     "states": [
      "form-empty",
      "form-filled"
     ]
    },
    {
     "key": "business_form_close",
     "states": [
      "form-empty",
      "form-filled"
     ]
    },
    {
     "key": "business_form_saved",
     "states": [
      "form-empty",
      "form-filled"
     ]
    },
    {
     "key": "label:Business Name · Enter your legal business name as registered",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "label:Short Name",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "label:License Number",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "label:Business Number",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "tap:business_add_form_landed:TextFiedl.invotick_clickable_text_field_2",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "label:Default category · Arrow drop down",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "nolabel@28,1057,692,1155",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "nolabel@28,1164,692,1262",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "label:Website",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "nolabel@28,1428,692,1526",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "label:Address line 2",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "tap:business_add_form_landed:BusinessListScreen.business_item_4",
     "states": [
      "list"
     ]
    },
    {
     "key": "tap:business_add_form_landed:BusinessListScreen.more_options_5",
     "states": [
      "list"
     ]
    },
    {
     "key": "business_list_screen_close",
     "states": [
      "list"
     ]
    },
    {
     "key": "tap:business_add_form_landed:Create Business",
     "states": [
      "list"
     ]
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36",
     "events": [
      "business_list_screen_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36",
     "events": [
      "business_list_screen_close#swipe"
     ]
    },
    {
     "match": "add_business_select_logo_click",
     "label": "Select Business Logo",
     "kind": "forward",
     "to": "create_business_choose_logo_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:446"
    },
    {
     "match": "re:^(label:Business\\ Name\\ ·\\ Name\\ ·\\ Enter\\ your\\ legal\\ business\\ name\\ as\\ registered|label:Business\\ Name\\ ·\\ Enter\\ your\\ legal\\ business\\ name\\ as\\ registered|label:Short\\ Name|label:License\\ Number|label:Business\\ Number|nolabel@28,1057,692,1155|nolabel@28,1164,692,1262|label:Website|nolabel@28,1428,692,1526|label:Address\\ line\\ 2)$",
     "label": "Business form text fields (type)",
     "kind": "stay",
     "stay": "types text",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:628"
    },
    {
     "match": "business_show_more_detail_clicked",
     "label": "Show More Details",
     "kind": "stay",
     "stay": "expands/collapses the extra fields",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:637"
    },
    {
     "match": "business_form_close",
     "label": "Close (X) on the form",
     "kind": "conditional",
     "branches": [
      {
       "when": "form was opened from the business list (back to the list page of this sheet)",
       "to": "business_add_form_landed"
      },
      {
       "when": "form is the sheet's first page (sheet closes)",
       "to": "create_inv_scr",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/businessBottomSheetNavigation.kt:53"
    },
    {
     "match": "business_form_saved",
     "label": "Save (closes; business set on the invoice)",
     "kind": "conditional",
     "branches": [
      {
       "when": "no name typed (button disabled)",
       "to": "business_add_form_landed"
      },
      {
       "when": "saved (may ask to confirm switching business if the invoice already has another)",
       "to": "create_inv_scr",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:235"
    },
    {
     "match": "re:^(tap:business_add_form_landed:TextFiedl\\.invotick_clickable_text_field_2|label:Default\\ category\\ ·\\ Arrow\\ drop\\ down)$",
     "label": "Business category field",
     "kind": "forward",
     "to": "create_business_business_category_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:675"
    },
    {
     "match": "tap:business_add_form_landed:BusinessListScreen.business_item_4",
     "label": "Pick a business (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/list/BusinessListScreen.kt:222"
    },
    {
     "match": "tap:business_add_form_landed:BusinessListScreen.more_options_5",
     "label": "More options (row)",
     "kind": "stay",
     "stay": "opens an Edit menu inline; Edit shows this business in the form page of this sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/list/BusinessListScreen.kt:520"
    },
    {
     "match": "business_list_screen_close",
     "label": "Close (X) on the list",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/list/BusinessListScreen.kt:133"
    },
    {
     "match": "tap:business_add_form_landed:Create Business",
     "label": "Create Business",
     "kind": "stay",
     "stay": "switches this sheet to the empty Add Business form (form-empty state)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/businessBottomSheetNavigation.kt:33"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:80",
     "events": [
      "business_list_screen_close#scrim_or_back"
     ]
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:55)"
  },
  "business_form_choose_logo_sheet": {
   "dataScreen": "business_form_choose_logo_sheet",
   "kind": "sheet",
   "parent": "create_business",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "business_form_choose_logo_sheet_close",
     "states": []
    },
    {
     "key": "tap:create_business:onboarding_SelectBusinessLogoContent.logo_camera",
     "states": []
    },
    {
     "key": "tap:create_business:onboarding_SelectBusinessLogoContent.logo_gallery",
     "states": []
    },
    {
     "key": "tap:create_business:LogoOptionItem.logo_logo",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "create_business",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:328",
     "events": [
      "business_form_choose_logo_sheet_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "create_business",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:328",
     "events": [
      "business_form_choose_logo_sheet_close#swipe"
     ]
    },
    {
     "match": "business_form_choose_logo_sheet_close",
     "label": "Close (X)",
     "kind": "backward",
     "to": "create_business",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:322"
    },
    {
     "match": "tap:create_business:onboarding_SelectBusinessLogoContent.logo_camera",
     "label": "Camera",
     "kind": "conditional",
     "branches": [
      {
       "when": "camera permission already granted",
       "to": "off:in_app_camera"
      },
      {
       "when": "permission not yet granted (if declined, stays here with an explanation dialog)",
       "outside": "Android camera-permission prompt",
       "to": "off:in_app_camera"
      }
     ],
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:331"
    },
    {
     "match": "tap:create_business:onboarding_SelectBusinessLogoContent.logo_gallery",
     "label": "Gallery",
     "kind": "outside",
     "outside": "Gallery (system photo picker)",
     "returnsTo": "off:image_cropper",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:332"
    },
    {
     "match": "tap:create_business:LogoOptionItem.logo_logo",
     "label": "Logo (ready-made designs)",
     "kind": "forward",
     "to": "off:business_form_logo_list_sheet",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:333"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "create_business",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:143",
     "events": [
      "business_form_choose_logo_sheet_close#scrim_or_back"
     ]
    }
   ],
   "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:313"
  },
  "business_list": {
   "dataScreen": "business_list",
   "kind": "screen",
   "parent": "drawer",
   "pictured": true,
   "states": [
    "filled"
   ],
   "controls": [
    {
     "key": "tap:business_list:BusinessListItem.business_list_item_1",
     "states": []
    },
    {
     "key": "tap:business_list:BusinessListItem.more_options_2",
     "states": []
    },
    {
     "key": "manage_business_screen_close",
     "states": []
    },
    {
     "key": "manage_business_create_fab_click",
     "states": []
    }
   ],
   "points": [
    {
     "match": "tap:business_list:BusinessListItem.business_list_item_1",
     "label": "Business row → details",
     "kind": "forward",
     "to": "business_details_scr",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/manageBusiness/components/BusinessListItem.kt:42; feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/manageBusiness/ManageBusinessScreen.kt:134; feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/navigation/BusinessNavigation.kt:65-67"
    },
    {
     "match": "tap:business_list:BusinessListItem.more_options_2",
     "label": "More options",
     "kind": "stay",
     "stay": "Dropdown inline: Set as Default / View Details (→ business_details)",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/manageBusiness/components/BusinessListItem.kt:186"
    },
    {
     "match": "manage_business_screen_close",
     "label": "Back arrow (navigateUp to where the drawer was opened)",
     "kind": "conditional",
     "branches": [
      {
       "when": "drawer opened on the Invoices tab",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "drawer opened on the Estimates tab",
       "to": "estimate_scr",
       "back": true
      }
     ],
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/manageBusiness/ManageBusinessScreen.kt:61; feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/navigation/BusinessNavigation.kt:71-73"
    },
    {
     "match": "manage_business_create_fab_click",
     "label": "Create Business (FAB)",
     "kind": "forward",
     "to": "create_business",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/manageBusiness/ManageBusinessScreen.kt:76-77; feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/navigation/BusinessNavigation.kt:68-70"
    },
    {
     "match": "@system_back",
     "label": "Android back (NavHost pops)",
     "kind": "conditional",
     "branches": [
      {
       "when": "drawer opened on the Invoices tab",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "drawer opened on the Estimates tab",
       "to": "estimate_scr",
       "back": true
      }
     ],
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/navigation/BusinessNavigation.kt:63 (no BackHandler)"
    }
   ],
   "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/navigation/BusinessNavigation.kt:63"
  },
  "client_add_form_landed": {
   "dataScreen": "client_add_form_landed",
   "kind": "sheet",
   "parent": "create_inv_scr",
   "pictured": true,
   "states": [
    "form-empty",
    "form-filled",
    "list"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "label:Client Name · Name · Enter your client name",
     "states": [
      "form-empty"
     ]
    },
    {
     "key": "tap:client_add_form_landed:create_CreateClientScreen.add_from_contacts_4",
     "states": [
      "form-empty",
      "form-filled"
     ]
    },
    {
     "key": "tap:client_add_form_landed:create_CreateClientScreen.create_client_content_2",
     "states": [
      "form-empty",
      "form-filled"
     ]
    },
    {
     "key": "label:Navigate back",
     "states": [
      "form-empty",
      "form-filled"
     ]
    },
    {
     "key": "tap:client_add_form_landed:Save",
     "states": [
      "form-empty",
      "form-filled"
     ]
    },
    {
     "key": "label:Client Name · Enter your client name",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "nolabel@28,624,692,722",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "nolabel@28,731,692,829",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "label:Address line 1 / Street Address",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "label:Address line 2",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "nolabel@28,1131,356,1229",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "label:State/Province",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "label:Zip/Postal Code",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "nolabel@364,1237,692,1335",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "label:Company Name",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "label:Client ID Number",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "label:Search · Search clients...",
     "states": [
      "list"
     ]
    },
    {
     "key": "tap:client_add_form_landed:list_ClientListScreen.client_item_4",
     "states": [
      "list"
     ]
    },
    {
     "key": "tap:client_add_form_landed:list_ClientListScreen.more_options_5",
     "states": [
      "list"
     ]
    },
    {
     "key": "invoice_client_list_screen_close",
     "states": [
      "list"
     ]
    },
    {
     "key": "tap:client_add_form_landed:list_ClientListScreen.enter_selection_mode_3",
     "states": [
      "list"
     ]
    },
    {
     "key": "tap:client_add_form_landed:Create Client",
     "states": [
      "list"
     ]
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36",
     "events": [
      "invoice_client_list_screen_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36",
     "events": [
      "invoice_client_list_screen_close#swipe"
     ]
    },
    {
     "match": "re:^(label:Client\\ Name\\ ·\\ Name\\ ·\\ Enter\\ your\\ client\\ name|label:Client\\ Name\\ ·\\ Enter\\ your\\ client\\ name|nolabel@28,624,692,722|nolabel@28,731,692,829|label:Address\\ line\\ 1\\ /\\ Street\\ Address|label:Address\\ line\\ 2|nolabel@28,1131,356,1229|label:State/Province|label:Zip/Postal\\ Code|nolabel@364,1237,692,1335|label:Company\\ Name|label:Client\\ ID\\ Number|label:Search\\ ·\\ Search\\ clients\\.\\.\\.)$",
     "label": "Client form / search text fields (type)",
     "kind": "stay",
     "stay": "types text",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/client/create/CreateClientScreen.kt:327"
    },
    {
     "match": "tap:client_add_form_landed:create_CreateClientScreen.add_from_contacts_4",
     "label": "Add from Contacts",
     "kind": "outside",
     "outside": "Phone contacts",
     "returnsTo": "client_add_form_landed",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/client/create/CreateClientScreen.kt:360"
    },
    {
     "match": "tap:client_add_form_landed:create_CreateClientScreen.create_client_content_2",
     "label": "Show More Details",
     "kind": "stay",
     "stay": "expands/collapses the extra fields",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/client/create/CreateClientScreen.kt:370"
    },
    {
     "match": "label:Navigate back",
     "label": "Close (X) on the form",
     "kind": "conditional",
     "branches": [
      {
       "when": "form was opened from the client list (back to the list page)",
       "to": "client_add_form_landed"
      },
      {
       "when": "form is the sheet's first page (sheet closes)",
       "to": "create_inv_scr",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/client/clientBottomSheetNavigation.kt:72"
    },
    {
     "match": "tap:client_add_form_landed:Save",
     "label": "Save (closes; client set on the invoice)",
     "kind": "conditional",
     "branches": [
      {
       "when": "no name typed (button disabled)",
       "to": "client_add_form_landed"
      },
      {
       "when": "saved",
       "to": "create_inv_scr",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/client/create/CreateClientScreen.kt:247"
    },
    {
     "match": "tap:client_add_form_landed:list_ClientListScreen.client_item_4",
     "label": "Pick a client (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/client/list/ClientListScreen.kt:248"
    },
    {
     "match": "tap:client_add_form_landed:list_ClientListScreen.more_options_5",
     "label": "More options (row)",
     "kind": "stay",
     "stay": "opens Edit/Delete menu inline; Edit shows the client in the form page, Delete asks to confirm",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/client/list/ClientListScreen.kt:501"
    },
    {
     "match": "invoice_client_list_screen_close",
     "label": "Close (X) on the list",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/client/list/ClientListScreen.kt:132"
    },
    {
     "match": "tap:client_add_form_landed:list_ClientListScreen.enter_selection_mode_3",
     "label": "Enter selection mode",
     "kind": "stay",
     "stay": "turns on multi-select for deleting clients",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/client/list/ClientListScreen.kt:178"
    },
    {
     "match": "tap:client_add_form_landed:Create Client",
     "label": "Create Client",
     "kind": "stay",
     "stay": "switches this sheet to the empty Add Client form (form-empty state)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/client/clientBottomSheetNavigation.kt:46"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:80",
     "events": [
      "invoice_client_list_screen_close#scrim_or_back"
     ]
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:56)"
  },
  "client_details": {
   "dataScreen": "client_details",
   "kind": "screen",
   "parent": "client_ledger_scr",
   "pictured": true,
   "states": [
    "default"
   ],
   "controls": [
    {
     "key": "tap:client_details:CustomerSummaryCard.customer_summary_card_1",
     "states": []
    },
    {
     "key": "tap:client_details:LedgerComponents.date_range_card_1",
     "states": []
    },
    {
     "key": "tap:client_details:LedgerComponents.quick_date_options_2",
     "states": []
    },
    {
     "key": "label:All · 3",
     "states": []
    },
    {
     "key": "label:Invoices · 2",
     "states": []
    },
    {
     "key": "label:Payments · 1",
     "states": []
    },
    {
     "key": "customer_details_top_bar_close",
     "states": []
    },
    {
     "key": "tap:client_details:CustomerDetailsTopBar.edit_customer_2",
     "states": []
    },
    {
     "key": "tap:client_details:CustomerDetailsTopBar.generate_pdf_1",
     "states": []
    }
   ],
   "points": [
    {
     "match": "tap:client_details:CustomerSummaryCard.customer_summary_card_1",
     "label": "Change customer → customer sheet",
     "kind": "forward",
     "to": "off:customer_details_customer_sheet",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/details/components/CustomerSummaryCard.kt:117; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/details/CustomerDetailsScreen.kt:154,97-99"
    },
    {
     "match": "tap:client_details:LedgerComponents.date_range_card_1",
     "label": "Date range card",
     "kind": "stay",
     "stay": "Opens the date-range picker dialog in place",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/details/components/LedgerComponents.kt:131"
    },
    {
     "match": "tap:client_details:LedgerComponents.quick_date_options_2",
     "label": "Quick date options",
     "kind": "stay",
     "stay": "Shows 1W/1M/3M/6M/12M chips inline",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/details/components/LedgerComponents.kt:182"
    },
    {
     "match": "re:^label:(All|Invoices|Payments) · \\d+$",
     "label": "Ledger filter chip",
     "kind": "stay",
     "stay": "Filters transactions",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/details/CustomerDetailsScreen.kt:210-215"
    },
    {
     "match": "customer_details_top_bar_close",
     "label": "Back arrow",
     "kind": "backward",
     "to": "client_ledger_scr",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/details/components/CustomerDetailsTopBar.kt:36,44; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/details/CustomerDetailsScreen.kt:131; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/navigation/CustomerNavigation.kt:96-98"
    },
    {
     "match": "tap:client_details:CustomerDetailsTopBar.edit_customer_2",
     "label": "Edit customer",
     "kind": "forward",
     "to": "off:edit_client",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/details/components/CustomerDetailsTopBar.kt:50; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/details/CustomerDetailsScreen.kt:132,84-86; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/navigation/CustomerNavigation.kt:102"
    },
    {
     "match": "tap:client_details:CustomerDetailsTopBar.generate_pdf_1",
     "label": "Generate PDF → customer ledger statement",
     "kind": "forward",
     "to": "off:client_ledger_detail",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/details/components/CustomerDetailsTopBar.kt:57; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/details/CustomerDetailsScreen.kt:133; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/details/CustomerDetailsViewModel.kt:301-307; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/navigation/CustomerNavigation.kt:99-101"
    },
    {
     "match": "@system_back",
     "label": "Android back",
     "kind": "backward",
     "to": "client_ledger_scr",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/details/CustomerDetailsScreen.kt:72; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/navigation/CustomerNavigation.kt:96-98"
    }
   ],
   "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/navigation/CustomerNavigation.kt:87"
  },
  "client_ledger_scr": {
   "dataScreen": "client_ledger_scr",
   "kind": "screen",
   "parent": "dashboard",
   "pictured": true,
   "states": [
    "empty",
    "filled"
   ],
   "controls": [
    {
     "key": "customer_client_list_screen_close",
     "states": []
    },
    {
     "key": "customers_add_client_fab_click",
     "states": []
    },
    {
     "key": "label:Invoice",
     "states": []
    },
    {
     "key": "label:Estimate",
     "states": []
    },
    {
     "key": "label:Analytics",
     "states": []
    },
    {
     "key": "label:Ledgers",
     "states": []
    },
    {
     "key": "label:Tools",
     "states": []
    },
    {
     "key": "tap:client_ledger_scr:ClientOverviewCard.client_overview_card_1",
     "states": [
      "filled"
     ]
    },
    {
     "key": "tap:client_ledger_scr:ClientOverviewCard.arrow_drop_down_2",
     "states": [
      "filled"
     ]
    },
    {
     "key": "label:All",
     "states": [
      "filled"
     ]
    },
    {
     "key": "label:Outstanding",
     "states": [
      "filled"
     ]
    },
    {
     "key": "label:Overdue · 2",
     "states": [
      "filled"
     ]
    },
    {
     "key": "label:Paid",
     "states": [
      "filled"
     ]
    },
    {
     "key": "label:No Invoices",
     "states": [
      "filled"
     ]
    },
    {
     "key": "tap:client_ledger_scr:ClientItem.client_ledger_card_1",
     "states": [
      "filled"
     ]
    },
    {
     "key": "tap:client_ledger_scr:ClientItem.chevron_right_2",
     "states": [
      "filled"
     ]
    }
   ],
   "points": [
    {
     "match": "customer_client_list_screen_close",
     "label": "Back arrow",
     "kind": "conditional",
     "branches": [
      {
       "when": "multi-select mode: cancels selection",
       "to": "client_ledger_scr"
      },
      {
       "when": "normal: pops the tab",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "app was opened straight into a new invoice (first run) and the Invoices list is not underneath",
       "to": "create_inv_scr",
       "back": true
      }
     ],
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/list/ClientListScreen.kt:149,157-163; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/navigation/CustomerNavigation.kt:81"
    },
    {
     "match": "customers_add_client_fab_click",
     "label": "Add Client (FAB)",
     "kind": "forward",
     "to": "off:create_client",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/list/ClientListScreen.kt:236-237,88; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/navigation/CustomerNavigation.kt:79"
    },
    {
     "match": "label:Invoice",
     "label": "Invoice tab",
     "kind": "forward",
     "to": "dashboard",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:978 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "label:Estimate",
     "label": "Estimate tab",
     "kind": "forward",
     "to": "estimate_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:993 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "label:Analytics",
     "label": "Analytics tab",
     "kind": "forward",
     "to": "analytics_dashboard_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:970 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "label:Ledgers",
     "label": "Ledgers tab (already here)",
     "kind": "stay",
     "stay": "Current tab: handleBottomNavigation returns without navigating",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:969"
    },
    {
     "match": "label:Tools",
     "label": "Tools tab",
     "kind": "forward",
     "to": "tools_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:1009 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "tap:client_ledger_scr:ClientOverviewCard.client_overview_card_1",
     "label": "Business name → business sheet",
     "kind": "forward",
     "to": "off:client_list_business_sheet",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/list/components/ClientOverviewCard.kt:145; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/list/components/ClientListContent.kt:91-93; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/list/ClientListScreen.kt:104-106"
    },
    {
     "match": "tap:client_ledger_scr:ClientOverviewCard.arrow_drop_down_2",
     "label": "Currency chip → currency picker",
     "kind": "forward",
     "to": "off:currency_picker",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/list/components/ClientOverviewCard.kt:202; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/list/components/ClientListContent.kt:94-96; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/list/ClientListScreen.kt:300; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:119"
    },
    {
     "match": "re:^label:(All|Outstanding|Overdue · \\d+|Paid|No Invoices)$",
     "label": "Filter chip",
     "kind": "stay",
     "stay": "Filters clients",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/list/components/ClientListContent.kt:105"
    },
    {
     "match": "tap:client_ledger_scr:ClientItem.client_ledger_card_1",
     "label": "Client card — Pushes CustomerRoute.Details twice (direct onClientSelected + ClientClicked event)",
     "kind": "forward",
     "to": "client_details",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/list/components/ClientItem.kt:142; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/list/ClientListScreen.kt:250-256; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/navigation/CustomerNavigation.kt:76-78"
    },
    {
     "match": "tap:client_ledger_scr:ClientItem.chevron_right_2",
     "label": "See more details",
     "kind": "forward",
     "to": "client_details",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/list/components/ClientItem.kt:230; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/list/ClientListScreen.kt:250-256; feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/navigation/CustomerNavigation.kt:76-78"
    },
    {
     "match": "@system_back",
     "label": "Android back (pops the tab)",
     "kind": "conditional",
     "branches": [
      {
       "when": "normal case: tabs are pushed over the Invoices list",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "app was opened straight into a new invoice (first run) and the Invoices list is not underneath",
       "to": "create_inv_scr",
       "back": true
      }
     ],
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:1001-1006 (no BackHandler; NavHost pops)"
    }
   ],
   "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/navigation/CustomerNavigation.kt:68"
  },
  "create_business": {
   "dataScreen": "create_business",
   "kind": "screen",
   "parent": "business_list",
   "pictured": true,
   "states": [
    "form"
   ],
   "controls": [
    {
     "key": "tap:create_business:LogoSelector.logo_selector_1",
     "states": []
    },
    {
     "key": "label:Business Name · Name · Enter your legal business name as registered",
     "states": []
    },
    {
     "key": "tap:create_business:business_form.toggle_details",
     "states": []
    },
    {
     "key": "business_form_screen_close",
     "states": []
    },
    {
     "key": "tap:create_business:Save",
     "states": []
    }
   ],
   "points": [
    {
     "match": "tap:create_business:LogoSelector.logo_selector_1",
     "label": "Select Business Logo",
     "kind": "forward",
     "to": "business_form_choose_logo_sheet",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:431"
    },
    {
     "match": "label:Business Name · Name · Enter your legal business name as registered",
     "label": "Business Name",
     "kind": "stay",
     "stay": "types text",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:176"
    },
    {
     "match": "tap:create_business:business_form.toggle_details",
     "label": "Show More Details",
     "kind": "stay",
     "stay": "expands/collapses the extra fields",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:460"
    },
    {
     "match": "business_form_screen_close",
     "label": "Back arrow",
     "kind": "conditional",
     "branches": [
      {
       "when": "something typed (Discard-changes dialog opens)",
       "to": "create_business"
      },
      {
       "when": "nothing typed; opened from Manage Businesses",
       "to": "business_list",
       "back": true
      },
      {
       "when": "nothing typed; opened from the drawer",
       "to": "dashboard",
       "back": true
      }
     ],
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:117"
    },
    {
     "match": "tap:create_business:Save",
     "label": "Save",
     "kind": "conditional",
     "branches": [
      {
       "when": "no name typed (button disabled)",
       "to": "create_business"
      },
      {
       "when": "saved; Manage Businesses is in the back stack",
       "to": "business_list"
      },
      {
       "when": "saved; opened from the drawer",
       "to": "dashboard"
      }
     ],
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:134"
    },
    {
     "match": "@system_back",
     "label": "Android back (no interception)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from Manage Businesses",
       "to": "business_list",
       "back": true
      },
      {
       "when": "opened from the drawer",
       "to": "dashboard",
       "back": true
      }
     ],
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/navigation/BusinessNavigation.kt:95"
    }
   ],
   "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/navigation/BusinessNavigation.kt:95 (screen name composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:1180)"
  },
  "create_business_business_category_sheet": {
   "dataScreen": "create_business_business_category_sheet",
   "kind": "sheet",
   "parent": "business_add_form_landed",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "create_business_business_category_sheet_close",
     "states": []
    },
    {
     "key": "tap:business_add_form_landed:BusinessCategoryItem.category_item",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "business_add_form_landed",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:407",
     "events": [
      "create_business_business_category_sheet_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "business_add_form_landed",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:407",
     "events": [
      "create_business_business_category_sheet_close#swipe"
     ]
    },
    {
     "match": "create_business_business_category_sheet_close",
     "label": "Back arrow",
     "kind": "backward",
     "to": "business_add_form_landed",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:401"
    },
    {
     "match": "tap:business_add_form_landed:BusinessCategoryItem.category_item",
     "label": "Pick a category (closes; Other makes the form ask for a custom category name)",
     "kind": "backward",
     "to": "business_add_form_landed",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:422"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "business_add_form_landed",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:80",
     "events": [
      "create_business_business_category_sheet_close#scrim_or_back"
     ]
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:393"
  },
  "create_business_choose_logo_sheet": {
   "dataScreen": "create_business_choose_logo_sheet",
   "kind": "sheet",
   "parent": "business_add_form_landed",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "create_business_choose_logo_sheet_close",
     "states": []
    },
    {
     "key": "tap:business_add_form_landed:onboarding_SelectBusinessLogoContent.logo_camera",
     "states": []
    },
    {
     "key": "tap:business_add_form_landed:onboarding_SelectBusinessLogoContent.logo_gallery",
     "states": []
    },
    {
     "key": "tap:business_add_form_landed:LogoOptionItem.logo_logo",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "business_add_form_landed",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:345",
     "events": [
      "create_business_choose_logo_sheet_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "business_add_form_landed",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:345",
     "events": [
      "create_business_choose_logo_sheet_close#swipe"
     ]
    },
    {
     "match": "create_business_choose_logo_sheet_close",
     "label": "Close (X)",
     "kind": "backward",
     "to": "business_add_form_landed",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:339"
    },
    {
     "match": "tap:business_add_form_landed:onboarding_SelectBusinessLogoContent.logo_camera",
     "label": "Camera",
     "kind": "conditional",
     "branches": [
      {
       "when": "camera permission already granted",
       "to": "off:in_app_camera"
      },
      {
       "when": "permission not yet granted (if declined, stays here with an explanation dialog)",
       "outside": "Android camera-permission prompt",
       "to": "off:in_app_camera"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:348"
    },
    {
     "match": "tap:business_add_form_landed:onboarding_SelectBusinessLogoContent.logo_gallery",
     "label": "Gallery",
     "kind": "outside",
     "outside": "Gallery (system photo picker)",
     "returnsTo": "off:image_cropper",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:349"
    },
    {
     "match": "tap:business_add_form_landed:LogoOptionItem.logo_logo",
     "label": "Logo (ready-made designs)",
     "kind": "forward",
     "to": "create_business_logo_list_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:350"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "business_add_form_landed",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:143",
     "events": [
      "create_business_choose_logo_sheet_close#scrim_or_back"
     ]
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:330"
  },
  "create_business_logo_list_sheet": {
   "dataScreen": "create_business_logo_list_sheet",
   "kind": "sheet",
   "parent": "business_add_form_landed",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "create_business_logo_list_sheet_close",
     "states": []
    },
    {
     "key": "nolabel@28,298,350,620",
     "states": []
    },
    {
     "key": "nolabel@371,298,692,619",
     "states": []
    },
    {
     "key": "nolabel@28,641,350,962",
     "states": []
    },
    {
     "key": "nolabel@371,641,692,962",
     "states": []
    },
    {
     "key": "nolabel@28,983,350,1305",
     "states": []
    },
    {
     "key": "nolabel@371,983,692,1305",
     "states": []
    },
    {
     "key": "nolabel@28,1326,350,1533",
     "states": []
    },
    {
     "key": "nolabel@371,1326,692,1533",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "business_add_form_landed",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:373",
     "events": [
      "create_business_logo_list_sheet_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "business_add_form_landed",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:373",
     "events": [
      "create_business_logo_list_sheet_close#swipe"
     ]
    },
    {
     "match": "create_business_logo_list_sheet_close",
     "label": "Back arrow",
     "kind": "backward",
     "to": "business_add_form_landed",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:367"
    },
    {
     "match": "re:^nolabel@",
     "label": "Logo design tile (closes; logo applied)",
     "kind": "backward",
     "to": "business_add_form_landed",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:377"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "business_add_form_landed",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:80",
     "events": [
      "create_business_logo_list_sheet_close#scrim_or_back"
     ]
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/business/create/CreateBusinessScreen.kt:359"
  },
  "create_estimate": {
   "dataScreen": "create_estimate",
   "kind": "screen",
   "parent": "estimate_scr",
   "pictured": true,
   "states": [
    "empty",
    "filled"
   ],
   "controls": [
    {
     "key": "estimate_meta_card_tap",
     "states": []
    },
    {
     "key": "estimate_inv_business_click",
     "states": []
    },
    {
     "key": "estimate_inv_client_click",
     "states": []
    },
    {
     "key": "estimate_inv_item_click",
     "states": []
    },
    {
     "key": "estimate_inv_discount_click",
     "states": []
    },
    {
     "key": "estimate_inv_tax_click",
     "states": []
    },
    {
     "key": "estimate_inv_shiping_click",
     "states": []
    },
    {
     "key": "tap:create_estimate:EstimateScreen.estimate_content_3",
     "states": []
    },
    {
     "key": "tap:create_estimate:card",
     "states": []
    },
    {
     "key": "estimate_inv_payment_method_click",
     "states": []
    },
    {
     "key": "esitmate_inv_preview_click",
     "states": []
    },
    {
     "key": "estimate_screen_close",
     "states": []
    }
   ],
   "points": [
    {
     "match": "estimate_meta_card_tap",
     "label": "Estimate no. / dates card → details sheet",
     "kind": "forward",
     "to": "off:estimate_details_sheet",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/document/estimate/EstimateScreen.kt:894,589,740"
    },
    {
     "match": "estimate_inv_business_click",
     "label": "FROM: add/choose business",
     "kind": "forward",
     "to": "business_add_form_landed",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/document/estimate/EstimateScreen.kt:919,590-596; feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/create/CreateEstimateViewModel.kt:418"
    },
    {
     "match": "estimate_inv_client_click",
     "label": "TO: add/choose client",
     "kind": "conditional",
     "branches": [
      {
       "when": "no business chosen yet: snackbar 'Please select a business first'",
       "to": "create_estimate"
      },
      {
       "when": "business chosen",
       "to": "client_add_form_landed"
      }
     ],
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/document/estimate/EstimateScreen.kt:942,597-603; feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/create/CreateEstimateViewModel.kt:422-429"
    },
    {
     "match": "estimate_inv_item_click",
     "label": "Add Item",
     "kind": "forward",
     "to": "item_form_scr",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/create/components/EstimateItemsCard.kt:115; feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/document/estimate/EstimateScreen.kt:1042-1048; feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/create/CreateEstimateViewModel.kt:574"
    },
    {
     "match": "estimate_inv_discount_click",
     "label": "Discount",
     "kind": "forward",
     "to": "discount_scr",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/create/components/EstimateItemsCard.kt:311; feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/document/estimate/EstimateScreen.kt:1049-1055"
    },
    {
     "match": "estimate_inv_tax_click",
     "label": "Tax",
     "kind": "forward",
     "to": "tax_scr",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/create/components/EstimateItemsCard.kt:329; feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/document/estimate/EstimateScreen.kt:1056-1062"
    },
    {
     "match": "estimate_inv_shiping_click",
     "label": "Shipping",
     "kind": "forward",
     "to": "shipping_scr",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/create/components/EstimateItemsCard.kt:338; feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/document/estimate/EstimateScreen.kt:1063-1069"
    },
    {
     "match": "tap:create_estimate:EstimateScreen.estimate_content_3",
     "label": "Currency pill",
     "kind": "forward",
     "to": "invoice_currency",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/document/estimate/EstimateScreen.kt:1083,604-610; feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/create/CreateEstimateViewModel.kt:432"
    },
    {
     "match": "tap:create_estimate:card",
     "label": "Terms and Conditions",
     "kind": "forward",
     "to": "terms_and_condintion_scr",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/document/estimate/EstimateScreen.kt:1127-1131,611-617"
    },
    {
     "match": "estimate_inv_payment_method_click",
     "label": "Payment Method",
     "kind": "forward",
     "to": "payment_method_scr",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/create/components/EstimatePaymentMethodCard.kt:23; feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/document/estimate/EstimateScreen.kt:618-624"
    },
    {
     "match": "esitmate_inv_preview_click",
     "label": "Preview → inline preview sheet",
     "kind": "forward",
     "to": "off:estimate_preview_sheet",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/document/estimate/EstimateScreen.kt:1145-1151,588,634"
    },
    {
     "match": "estimate_screen_close",
     "label": "Back arrow",
     "kind": "conditional",
     "branches": [
      {
       "when": "estimate has business + client + item and unsaved changes",
       "to": "discard_changes_dialog",
       "back": true
      },
      {
       "when": "otherwise",
       "to": "estimate_scr",
       "back": true
      }
     ],
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/document/estimate/EstimateScreen.kt:558,567; feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/create/CreateEstimateViewModel.kt:245-254; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/EstimateDocNavigation.kt:115"
    },
    {
     "match": "@system_back",
     "label": "Android back",
     "kind": "conditional",
     "branches": [
      {
       "when": "details sheet or first-estimate celebration open: closes it",
       "to": "create_estimate"
      },
      {
       "when": "estimate has business + client + item and unsaved changes",
       "to": "discard_changes_dialog",
       "back": true
      },
      {
       "when": "otherwise",
       "to": "estimate_scr",
       "back": true
      }
     ],
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/document/estimate/EstimateScreen.kt:404-409; feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/create/CreateEstimateViewModel.kt:245-254"
    }
   ],
   "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/EstimateDocNavigation.kt:80"
  },
  "create_inv_scr": {
   "dataScreen": "create_inv_scr",
   "kind": "screen",
   "parent": "dashboard",
   "pictured": true,
   "states": [
    "discard-dialog",
    "empty",
    "filled",
    "tour-1-business",
    "tour-2-client",
    "tour-3-items",
    "tour-4-send",
    "validation-error"
   ],
   "controls": [
    {
     "key": "discard_dialog_closed",
     "states": [
      "discard-dialog"
     ]
    },
    {
     "key": "Draft_click",
     "states": [
      "discard-dialog"
     ]
    },
    {
     "key": "discard_confirmed",
     "states": [
      "discard-dialog"
     ]
    },
    {
     "key": "discard_cancelled",
     "states": [
      "discard-dialog"
     ]
    },
    {
     "key": "invoice_meta_card_tap",
     "states": [
      "empty",
      "tour-1-business",
      "tour-2-client",
      "tour-3-items",
      "validation-error"
     ]
    },
    {
     "key": "tap:create_inv_scr:InvoiceScreen.business_card_tap",
     "states": [
      "empty",
      "tour-1-business",
      "tour-2-client",
      "tour-3-items",
      "validation-error"
     ]
    },
    {
     "key": "create_inv_client_click",
     "states": [
      "empty",
      "tour-1-business",
      "tour-2-client",
      "tour-3-items",
      "validation-error"
     ]
    },
    {
     "key": "create_inv_add_item_click",
     "states": [
      "empty",
      "filled",
      "tour-1-business",
      "tour-2-client",
      "tour-3-items",
      "tour-4-send",
      "validation-error"
     ]
    },
    {
     "key": "create_inv_discount_click",
     "states": [
      "empty",
      "filled",
      "tour-1-business",
      "tour-2-client",
      "tour-3-items",
      "tour-4-send",
      "validation-error"
     ]
    },
    {
     "key": "create_inv_tax_click",
     "states": [
      "empty",
      "filled",
      "tour-1-business",
      "tour-2-client",
      "tour-3-items",
      "tour-4-send",
      "validation-error"
     ]
    },
    {
     "key": "create_inv_shipping_click",
     "states": [
      "empty",
      "filled",
      "tour-1-business",
      "tour-2-client",
      "tour-3-items",
      "tour-4-send",
      "validation-error"
     ]
    },
    {
     "key": "create_inv_add_payment_click",
     "states": [
      "empty",
      "tour-1-business",
      "tour-2-client",
      "tour-3-items",
      "validation-error"
     ]
    },
    {
     "key": "tap:create_inv_scr:InvoiceScreen.invoice_content_1",
     "states": [
      "empty",
      "filled",
      "tour-1-business",
      "tour-2-client",
      "tour-3-items",
      "tour-4-send",
      "validation-error"
     ]
    },
    {
     "key": "create_inv_terms_click",
     "states": [
      "empty",
      "tour-1-business",
      "tour-2-client",
      "tour-3-items",
      "validation-error"
     ]
    },
    {
     "key": "create_inv_preview_click",
     "states": [
      "empty",
      "filled",
      "tour-1-business",
      "tour-2-client",
      "tour-3-items",
      "tour-4-send",
      "validation-error"
     ]
    },
    {
     "key": "invoice_screen_close",
     "states": [
      "empty",
      "filled",
      "tour-1-business",
      "tour-2-client",
      "tour-3-items",
      "tour-4-send",
      "validation-error"
     ]
    },
    {
     "key": "tap:create_inv_scr:AdaptiveHeaderZone.expand_1",
     "states": [
      "filled",
      "tour-4-send"
     ]
    },
    {
     "key": "tap:create_inv_scr:ItemPaymentCard.item_info_row_5",
     "states": [
      "filled",
      "tour-4-send"
     ]
    },
    {
     "key": "tap:create_inv_scr:ItemPaymentCard.items_list_4",
     "states": [
      "filled",
      "tour-4-send"
     ]
    },
    {
     "key": "create_inv_saved_click",
     "states": [
      "filled",
      "tour-4-send"
     ]
    },
    {
     "key": "invoice_overlay_clicked",
     "states": [
      "tour-1-business",
      "tour-2-client",
      "tour-3-items"
     ]
    }
   ],
   "points": [
    {
     "match": "discard_dialog_closed",
     "label": "Discard dialog: close (X)",
     "kind": "stay",
     "stay": "closes the dialog, keeps editing",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/components/DiscardChangesDialog.kt:144"
    },
    {
     "match": "Draft_click",
     "label": "Discard dialog: Save as Draft (leaves)",
     "kind": "conditional",
     "branches": [
      {
       "when": "draft saved (pops back to the screen that opened Create (usually the invoice list))",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "draft write fails (stays with an error)",
       "to": "create_inv_scr"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:573"
    },
    {
     "match": "discard_confirmed",
     "label": "Discard dialog: Discard Everything (leaves)",
     "kind": "backward",
     "to": "dashboard",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/components/DiscardChangesDialog.kt:277"
    },
    {
     "match": "discard_cancelled",
     "label": "Discard dialog: Keep Editing",
     "kind": "stay",
     "stay": "closes the dialog, keeps editing",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/components/DiscardChangesDialog.kt:313"
    },
    {
     "match": "invoice_meta_card_tap",
     "label": "Invoice no. / dates card",
     "kind": "forward",
     "to": "off:invoice_details_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:773"
    },
    {
     "match": "tap:create_inv_scr:InvoiceScreen.business_card_tap",
     "label": "FROM: Add Business",
     "kind": "forward",
     "to": "business_add_form_landed",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:774"
    },
    {
     "match": "create_inv_client_click",
     "label": "TO: Add Client",
     "kind": "forward",
     "to": "client_add_form_landed",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:781"
    },
    {
     "match": "create_inv_add_item_click",
     "label": "Add Item",
     "kind": "forward",
     "to": "item_form_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:1569"
    },
    {
     "match": "create_inv_discount_click",
     "label": "Discount",
     "kind": "conditional",
     "branches": [
      {
       "when": "no business chosen yet (stays, 'Create a business first')",
       "to": "create_inv_scr"
      },
      {
       "when": "business chosen",
       "to": "discount_scr"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:1576"
    },
    {
     "match": "create_inv_tax_click",
     "label": "Tax",
     "kind": "forward",
     "to": "tax_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:1583"
    },
    {
     "match": "create_inv_shipping_click",
     "label": "Shipping",
     "kind": "conditional",
     "branches": [
      {
       "when": "no business chosen yet (stays, 'Create a business first')",
       "to": "create_inv_scr"
      },
      {
       "when": "business chosen",
       "to": "shipping_scr"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:1590"
    },
    {
     "match": "create_inv_add_payment_click",
     "label": "Add Payment",
     "kind": "conditional",
     "branches": [
      {
       "when": "no business chosen yet (stays, 'Create a business first')",
       "to": "create_inv_scr"
      },
      {
       "when": "business chosen",
       "to": "add_payment_scr"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:1597"
    },
    {
     "match": "tap:create_inv_scr:InvoiceScreen.invoice_content_1",
     "label": "Currency pill (USD)",
     "kind": "conditional",
     "branches": [
      {
       "when": "currency locked by the client (stays, 'Currency is locked' message)",
       "to": "create_inv_scr"
      },
      {
       "when": "otherwise",
       "to": "invoice_currency"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:1619"
    },
    {
     "match": "create_inv_terms_click",
     "label": "Terms and Conditions",
     "kind": "forward",
     "to": "terms_and_condintion_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:795"
    },
    {
     "match": "create_inv_preview_click",
     "label": "Preview",
     "kind": "forward",
     "to": "off:invoice_preview_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:772"
    },
    {
     "match": "invoice_screen_close",
     "label": "Back arrow",
     "kind": "conditional",
     "branches": [
      {
       "when": "invoice has content worth keeping (Discard dialog opens (discard-dialog state))",
       "to": "create_inv_scr"
      },
      {
       "when": "nothing entered (pops to the opener (invoice list; estimate list when converting))",
       "to": "dashboard",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:742"
    },
    {
     "match": "tap:create_inv_scr:AdaptiveHeaderZone.expand_1",
     "label": "Compact header (expand)",
     "kind": "stay",
     "stay": "expands the header back to full cards",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:1528"
    },
    {
     "match": "re:^(tap:create_inv_scr:ItemPaymentCard\\.item_info_row_5|tap:create_inv_scr:ItemPaymentCard\\.items_list_4)$",
     "label": "Item line (edit item)",
     "kind": "forward",
     "to": "invoice_item_form",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:1607"
    },
    {
     "match": "create_inv_saved_click",
     "label": "Save",
     "kind": "conditional",
     "branches": [
      {
       "when": "not premium and the save gate (Remote Config saved_invoice_inter_enable) is on",
       "to": "ad_dialog_shown"
      },
      {
       "when": "premium or gate off; invoice passes validation (the user's first invoice shows the celebration overlay first, then saved_inv_scr)",
       "to": "saved_inv_scr"
      },
      {
       "when": "premium or gate off; validation fails (stays, field marked (validation-error))",
       "to": "create_inv_scr"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:1687"
    },
    {
     "match": "invoice_overlay_clicked",
     "label": "Tour dim overlay",
     "kind": "stay",
     "stay": "swallows the tap; only the highlighted card responds",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:2293"
    },
    {
     "match": "@system_back",
     "label": "Android back",
     "kind": "conditional",
     "branches": [
      {
       "when": "first-invoice celebration is showing",
       "to": "saved_inv_scr",
       "back": true
      },
      {
       "when": "invoice-details sheet is open (closes that sheet)",
       "to": "create_inv_scr"
      },
      {
       "when": "invoice has content (Discard dialog opens)",
       "to": "create_inv_scr"
      },
      {
       "when": "nothing entered",
       "to": "dashboard",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:546",
     "events": [
      "invoice_screen_close#back_press"
     ]
    }
   ],
   "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/InvoiceDocNavigation.kt:97"
  },
  "create_product_category_sheet": {
   "dataScreen": "create_product_category_sheet",
   "kind": "sheet",
   "parent": "item_form_scr",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "label:Search · Search categories...",
     "states": []
    },
    {
     "key": "tap:item_form_scr:CategoryScreen.category_item_4",
     "states": []
    },
    {
     "key": "tap:item_form_scr:CategoryScreen.more_options_5",
     "states": []
    },
    {
     "key": "category_screen_close",
     "states": []
    },
    {
     "key": "tap:item_form_scr:CategoryScreen.enter_selection_mode_3",
     "states": []
    },
    {
     "key": "tap:create_product_category_sheet:Create Category",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:269",
     "events": [
      "category_screen_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:269",
     "events": [
      "category_screen_close#swipe"
     ]
    },
    {
     "match": "label:Search · Search categories...",
     "label": "Search",
     "kind": "stay",
     "stay": "types a search filter"
    },
    {
     "match": "tap:item_form_scr:CategoryScreen.category_item_4",
     "label": "Pick a category (closes)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/category/CategoryScreen.kt:87"
    },
    {
     "match": "tap:item_form_scr:CategoryScreen.more_options_5",
     "label": "More options (row)",
     "kind": "stay",
     "stay": "opens Edit/Delete menu inline (edit/confirm dialogs stay in this sheet)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/category/CategoryScreen.kt:424"
    },
    {
     "match": "category_screen_close",
     "label": "Close (X)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/category/CategoryScreen.kt:121"
    },
    {
     "match": "tap:item_form_scr:CategoryScreen.enter_selection_mode_3",
     "label": "Selection mode",
     "kind": "stay",
     "stay": "turns on multi-select for deleting",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/category/CategoryScreen.kt:161"
    },
    {
     "match": "tap:create_product_category_sheet:Create Category",
     "label": "Create button",
     "kind": "stay",
     "stay": "opens the Add Category dialog inside this sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/category/CategoryScreen.kt:185"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:80",
     "events": [
      "category_screen_close#scrim_or_back"
     ]
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:269"
  },
  "create_product_discount_sheet": {
   "dataScreen": "create_product_discount_sheet",
   "kind": "sheet",
   "parent": "item_form_scr",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "label:%",
     "states": []
    },
    {
     "key": "tap:item_form_scr:TextFiedl.invotick_clickable_text_field_2",
     "states": []
    },
    {
     "key": "label:Select discount type",
     "states": []
    },
    {
     "key": "tap:item_form_scr:DiscountScreen.select_discount_type_1",
     "states": []
    },
    {
     "key": "dicount_scr_close",
     "states": []
    },
    {
     "key": "discount_add_success",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:214",
     "events": [
      "dicount_scr_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:214",
     "events": [
      "dicount_scr_close#swipe"
     ]
    },
    {
     "match": "label:%",
     "label": "Discount value",
     "kind": "stay",
     "stay": "types the discount",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/discount/DiscountScreen.kt"
    },
    {
     "match": "re:^(tap:item_form_scr:TextFiedl\\.invotick_clickable_text_field_2|label:Select\\ discount\\ type|tap:item_form_scr:DiscountScreen\\.select_discount_type_1)$",
     "label": "Discount type (% / amount)",
     "kind": "stay",
     "stay": "opens the discount-type menu inline",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/discount/DiscountScreen.kt:187"
    },
    {
     "match": "dicount_scr_close",
     "label": "Close (X)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/discount/DiscountScreen.kt:95"
    },
    {
     "match": "discount_add_success",
     "label": "Save (closes; discount applied)",
     "kind": "conditional",
     "branches": [
      {
       "when": "value empty/invalid or larger than the amount (button disabled / refused with a message)",
       "to": "create_product_discount_sheet"
      },
      {
       "when": "valid",
       "to": "item_form_scr",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:236"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:80",
     "events": [
      "dicount_scr_close#scrim_or_back"
     ]
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:214"
  },
  "create_product_tax_sheet": {
   "dataScreen": "create_product_tax_sheet",
   "kind": "sheet",
   "parent": "item_form_scr",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "label:Search · Search taxes...",
     "states": []
    },
    {
     "key": "tax_added_success",
     "states": []
    },
    {
     "key": "tap:item_form_scr:TaxScreen.more_options_5",
     "states": []
    },
    {
     "key": "tax_scr_close",
     "states": []
    },
    {
     "key": "tap:item_form_scr:TaxScreen.enter_selection_mode_3",
     "states": []
    },
    {
     "key": "tap:create_product_tax_sheet:Create Tax",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:246",
     "events": [
      "tax_scr_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:246",
     "events": [
      "tax_scr_close#swipe"
     ]
    },
    {
     "match": "label:Search · Search taxes...",
     "label": "Search",
     "kind": "stay",
     "stay": "types a search filter"
    },
    {
     "match": "tax_added_success",
     "label": "Pick a tax (closes)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/tax/TaxScreen.kt:251"
    },
    {
     "match": "tap:item_form_scr:TaxScreen.more_options_5",
     "label": "More options (row)",
     "kind": "stay",
     "stay": "opens Edit/Delete menu inline (edit/confirm dialogs stay in this sheet)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/tax/TaxScreen.kt:509"
    },
    {
     "match": "tax_scr_close",
     "label": "Close (X)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/tax/TaxScreen.kt:137"
    },
    {
     "match": "tap:item_form_scr:TaxScreen.enter_selection_mode_3",
     "label": "Selection mode",
     "kind": "stay",
     "stay": "turns on multi-select for deleting",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/tax/TaxScreen.kt:184"
    },
    {
     "match": "tap:create_product_tax_sheet:Create Tax",
     "label": "Create button",
     "kind": "stay",
     "stay": "opens the Add Tax dialog inside this sheet (saving it applies the tax and closes)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/tax/TaxScreen.kt:231"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:80",
     "events": [
      "tax_scr_close#scrim_or_back"
     ]
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:246"
  },
  "create_product_unit_type_sheet": {
   "dataScreen": "create_product_unit_type_sheet",
   "kind": "sheet",
   "parent": "item_form_scr",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "label:Search · Search unit types...",
     "states": []
    },
    {
     "key": "tap:item_form_scr:UnitTypeScreen.unit_type_item_4",
     "states": []
    },
    {
     "key": "tap:item_form_scr:UnitTypeScreen.more_options_5",
     "states": []
    },
    {
     "key": "unit_type_screen_close",
     "states": []
    },
    {
     "key": "tap:item_form_scr:UnitTypeScreen.enter_selection_mode_3",
     "states": []
    },
    {
     "key": "tap:create_product_unit_type_sheet:Create Unit Type",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:290",
     "events": [
      "unit_type_screen_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:290",
     "events": [
      "unit_type_screen_close#swipe"
     ]
    },
    {
     "match": "label:Search · Search unit types...",
     "label": "Search",
     "kind": "stay",
     "stay": "types a search filter"
    },
    {
     "match": "tap:item_form_scr:UnitTypeScreen.unit_type_item_4",
     "label": "Pick a unit type (closes)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/unitType/UnitTypeScreen.kt:90"
    },
    {
     "match": "tap:item_form_scr:UnitTypeScreen.more_options_5",
     "label": "More options (row)",
     "kind": "stay",
     "stay": "opens Edit/Delete menu inline (edit/confirm dialogs stay in this sheet)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/unitType/UnitTypeScreen.kt:427"
    },
    {
     "match": "unit_type_screen_close",
     "label": "Close (X)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/unitType/UnitTypeScreen.kt:124"
    },
    {
     "match": "tap:item_form_scr:UnitTypeScreen.enter_selection_mode_3",
     "label": "Selection mode",
     "kind": "stay",
     "stay": "turns on multi-select for deleting",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/unitType/UnitTypeScreen.kt:164"
    },
    {
     "match": "tap:create_product_unit_type_sheet:Create Unit Type",
     "label": "Create button",
     "kind": "stay",
     "stay": "opens the Add Unit Type dialog inside this sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/unitType/UnitTypeScreen.kt:188"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "item_form_scr",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:80",
     "events": [
      "unit_type_screen_close#scrim_or_back"
     ]
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:290"
  },
  "customer_list": {
   "dataScreen": "customer_list",
   "kind": "screen",
   "parent": "tools_scr",
   "pictured": true,
   "states": [
    "empty",
    "filled"
   ],
   "controls": [
    {
     "key": "paymentform_client_list_screen_close",
     "states": []
    },
    {
     "key": "label:All",
     "states": [
      "filled"
     ]
    },
    {
     "key": "label:Overdue",
     "states": [
      "filled"
     ]
    },
    {
     "key": "label:Paid",
     "states": [
      "filled"
     ]
    },
    {
     "key": "label:No Invoices",
     "states": [
      "filled"
     ]
    },
    {
     "key": "tap:customer_list:customerList_ClientListScreen.client_payment_card_1",
     "states": [
      "filled"
     ]
    },
    {
     "key": "tap:customer_list:customerList_ClientListScreen.chevron_right_2",
     "states": [
      "filled"
     ]
    },
    {
     "key": "label:Outstanding · 3",
     "states": [
      "filled"
     ]
    }
   ],
   "points": [
    {
     "match": "paymentform_client_list_screen_close",
     "label": "Back arrow (pops to where it was opened)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from Tools → Payment Form",
       "to": "tools_scr",
       "back": true
      },
      {
       "when": "opened from the drawer's Payments / Payment slips",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "multi-select mode: cancels selection",
       "to": "customer_list"
      }
     ],
     "source": "feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/presentation/customerList/ClientListScreen.kt:94,101-106; feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/navigation/PaymentFormNavigation.kt:127"
    },
    {
     "match": "re:^label:(All|Outstanding(?: · \\d+)?|Overdue|Paid|No Invoices)$",
     "label": "Filter chip",
     "kind": "stay",
     "stay": "Filters clients",
     "source": "feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/presentation/customerList/ClientListScreen.kt:281-325"
    },
    {
     "match": "tap:customer_list:customerList_ClientListScreen.client_payment_card_1",
     "label": "Client payment card — Pushes payementFormList twice (direct onClientSelected + ClientClicked event)",
     "kind": "forward",
     "to": "off:payment_form_list",
     "source": "feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/presentation/customerList/ClientListScreen.kt:402,118-124; feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/navigation/PaymentFormNavigation.kt:122-124"
    },
    {
     "match": "tap:customer_list:customerList_ClientListScreen.chevron_right_2",
     "label": "View Details",
     "kind": "forward",
     "to": "off:payment_form_list",
     "source": "feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/presentation/customerList/ClientListScreen.kt:492,118-124; feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/navigation/PaymentFormNavigation.kt:122-124"
    },
    {
     "match": "@system_back",
     "label": "Android back (NavHost pops)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from Tools",
       "to": "tools_scr",
       "back": true
      },
      {
       "when": "opened from the drawer",
       "to": "dashboard",
       "back": true
      }
     ],
     "source": "feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/navigation/PaymentFormNavigation.kt:119 (no BackHandler)"
    }
   ],
   "source": "feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/navigation/PaymentFormNavigation.kt:119"
  },
  "dashboard": {
   "dataScreen": "dashboard",
   "kind": "screen",
   "parent": "splash_scr",
   "pictured": true,
   "states": [
    "delete-dialog",
    "empty-business",
    "filled",
    "filter-overdue",
    "first-run",
    "multi-select"
   ],
   "controls": [
    {
     "key": "tap:dashboard:components_DeleteInvoiceDialog.close_1",
     "states": [
      "delete-dialog"
     ]
    },
    {
     "key": "tap:dashboard:components_DeleteInvoiceDialog.yes_delete_if_invoicecount_1_2",
     "states": [
      "delete-dialog"
     ]
    },
    {
     "key": "tap:dashboard:components_DeleteInvoiceDialog.cancel_3",
     "states": [
      "delete-dialog"
     ]
    },
    {
     "key": "tap:dashboard:RevenueOverviewCard.a_l_l_1",
     "states": [
      "empty-business",
      "filled",
      "filter-overdue"
     ]
    },
    {
     "key": "nolabel@49,829,671,898",
     "states": [
      "empty-business"
     ]
    },
    {
     "key": "db_sidebar_click",
     "states": [
      "empty-business",
      "filled",
      "filter-overdue",
      "first-run",
      "multi-select"
     ]
    },
    {
     "key": "tap:dashboard:InvoiceListScreen.go_premium_4",
     "states": [
      "empty-business",
      "filled",
      "filter-overdue",
      "first-run"
     ]
    },
    {
     "key": "tap:dashboard:InvoiceListScreen.contact_support_5",
     "states": [
      "empty-business",
      "filled",
      "filter-overdue",
      "first-run"
     ]
    },
    {
     "key": "db_create_invoice_fab_click",
     "states": [
      "empty-business",
      "filled",
      "filter-overdue"
     ]
    },
    {
     "key": "label:Invoice",
     "states": [
      "empty-business",
      "filled",
      "filter-overdue",
      "first-run",
      "multi-select"
     ]
    },
    {
     "key": "label:Estimate",
     "states": [
      "empty-business",
      "filled",
      "filter-overdue",
      "first-run",
      "multi-select"
     ]
    },
    {
     "key": "label:Analytics",
     "states": [
      "empty-business",
      "filled",
      "filter-overdue",
      "first-run",
      "multi-select"
     ]
    },
    {
     "key": "label:Ledgers",
     "states": [
      "empty-business",
      "filled",
      "filter-overdue",
      "first-run",
      "multi-select"
     ]
    },
    {
     "key": "label:Tools",
     "states": [
      "empty-business",
      "filled",
      "filter-overdue",
      "first-run",
      "multi-select"
     ]
    },
    {
     "key": "label:All",
     "states": [
      "filled",
      "filter-overdue"
     ]
    },
    {
     "key": "label:Draft · 1",
     "states": [
      "filled",
      "filter-overdue"
     ]
    },
    {
     "key": "label:Unpaid · 2",
     "states": [
      "filled",
      "filter-overdue"
     ]
    },
    {
     "key": "label:Overdue · 1",
     "states": [
      "filled",
      "filter-overdue"
     ]
    },
    {
     "key": "label:Paid · 1",
     "states": [
      "filled",
      "filter-overdue"
     ]
    },
    {
     "key": "tap:dashboard:InvoiceListScreen.multi_select_2",
     "states": [
      "filled",
      "filter-overdue"
     ]
    },
    {
     "key": "db_create_first_inv_click",
     "states": [
      "first-run"
     ]
    },
    {
     "key": "tap:dashboard:InvoiceListScreen.delete_selected_1",
     "states": [
      "multi-select"
     ]
    },
    {
     "key": "tap:dashboard:InvoiceListItem.invoice_item",
     "states": [
      "filled",
      "filter-overdue",
      "multi-select"
     ]
    }
   ],
   "points": [
    {
     "match": "tap:dashboard:components_DeleteInvoiceDialog.close_1",
     "label": "Close delete dialog",
     "kind": "backward",
     "to": "dashboard",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/components/DeleteInvoiceDialog.kt:80; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:414"
    },
    {
     "match": "tap:dashboard:components_DeleteInvoiceDialog.yes_delete_if_invoicecount_1_2",
     "label": "Yes, delete (deletes selected, closes dialog)",
     "kind": "backward",
     "to": "dashboard",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/components/DeleteInvoiceDialog.kt:195; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:413"
    },
    {
     "match": "tap:dashboard:components_DeleteInvoiceDialog.cancel_3",
     "label": "Cancel delete (closes dialog)",
     "kind": "backward",
     "to": "dashboard",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/components/DeleteInvoiceDialog.kt:224; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:414"
    },
    {
     "match": "tap:dashboard:RevenueOverviewCard.a_l_l_1",
     "label": "Business name on revenue card → business switcher sheet",
     "kind": "forward",
     "to": "db_business_list_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/components/RevenueOverviewCard.kt:131; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:607,173"
    },
    {
     "match": "nolabel@49,829,671,898",
     "label": "'All Businesses' link in the no-invoices-for-this-business line (inferred from position)",
     "kind": "stay",
     "stay": "Switches the dashboard to All Businesses (AllBusinessesSelected)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:642-650"
    },
    {
     "match": "db_sidebar_click",
     "label": "Open menu (drawer)",
     "kind": "conditional",
     "branches": [
      {
       "when": "normal mode",
       "to": "drawer"
      },
      {
       "when": "multi-select mode: icon cancels selection",
       "to": "dashboard"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:214,227-232; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/InvoiceDocNavigation.kt:90; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:604-611"
    },
    {
     "match": "tap:dashboard:InvoiceListScreen.go_premium_4",
     "label": "Go Premium",
     "kind": "forward",
     "to": "premium_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:322-323; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:881"
    },
    {
     "match": "tap:dashboard:InvoiceListScreen.contact_support_5",
     "label": "Contact Support → feedback dialog",
     "kind": "forward",
     "to": "feedback_dialog",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:348-349,446"
    },
    {
     "match": "db_create_invoice_fab_click",
     "label": "Create Invoice (FAB)",
     "kind": "forward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:387-388,139; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/InvoiceDocNavigation.kt:61-69"
    },
    {
     "match": "label:Invoice",
     "label": "Invoice tab (already here)",
     "kind": "stay",
     "stay": "Current tab: handleBottomNavigation returns without navigating",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:969"
    },
    {
     "match": "label:Estimate",
     "label": "Estimate tab",
     "kind": "forward",
     "to": "estimate_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:993 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "label:Analytics",
     "label": "Analytics tab",
     "kind": "forward",
     "to": "analytics_dashboard_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:970 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "label:Ledgers",
     "label": "Ledgers tab",
     "kind": "forward",
     "to": "client_ledger_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:1001 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "label:Tools",
     "label": "Tools tab",
     "kind": "forward",
     "to": "tools_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:1009 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "re:^label:(All|Draft · \\d+|Unpaid · \\d+|Overdue · \\d+|Paid · \\d+)$",
     "label": "Status filter chip",
     "kind": "stay",
     "stay": "Filters the invoice list by status",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:632"
    },
    {
     "match": "tap:dashboard:InvoiceListItem.invoice_item",
     "label": "Open invoice row",
     "kind": "conditional",
     "branches": [
      {
       "when": "invoice is a draft",
       "to": "edit_inv_scr"
      },
      {
       "when": "any other status",
       "to": "saved_inv_scr"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:729-741,140-146; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/InvoiceDocNavigation.kt:71-88"
    },
    {
     "match": "tap:dashboard:InvoiceListScreen.multi_select_2",
     "label": "Multi-select",
     "kind": "stay",
     "stay": "Enters multi-select mode (dashboard multi-select state)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:286-288"
    },
    {
     "match": "db_create_first_inv_click",
     "label": "Create your first invoice (first-run)",
     "kind": "forward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/components/FirstInvoiceEmptyState.kt:150; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:578; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/InvoiceDocNavigation.kt:61-69"
    },
    {
     "match": "tap:dashboard:InvoiceListItem.invoice_item",
     "label": "Invoice row in multi-select",
     "kind": "stay",
     "stay": "Toggles this invoice's selection",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:730-735"
    },
    {
     "match": "tap:dashboard:InvoiceListScreen.delete_selected_1",
     "label": "Delete selected",
     "kind": "forward",
     "to": "delete_invoice_dialog",
     "toState": "one",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:430; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListViewModel.kt:696"
    },
    {
     "match": "@total",
     "label": "Total on the revenue card (only when the invoices are in several currencies)",
     "kind": "forward",
     "to": "currency_breakdown_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:630; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:488"
    },
    {
     "match": "@system_back",
     "label": "Android back",
     "kind": "conditional",
     "branches": [
      {
       "when": "drawer open: closes it",
       "to": "dashboard"
      },
      {
       "when": "nothing underneath (normal): exit dialog",
       "to": "exit_scr",
       "back": true
      },
      {
       "when": "a screen is underneath (e.g. first-run Create Invoice)",
       "to": "create_inv_scr",
       "back": true
      }
     ],
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:350-361"
    }
   ],
   "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/InvoiceDocNavigation.kt:49"
  },
  "dashboard_business_sheet": {
   "dataScreen": "dashboard_business_sheet",
   "kind": "sheet",
   "parent": "analytics_dashboard_scr",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "tap:analytics_dashboard_scr:BusinessListForDashboard.business_item_for_dashboard_1",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "analytics_dashboard_scr",
     "source": "feature/dashboard/src/commonMain/kotlin/invotick/invoicemaker/feature/dashboard/presentation/DashboardScreen.kt:63-65"
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe sheet down (closes)",
     "kind": "backward",
     "to": "analytics_dashboard_scr",
     "source": "feature/dashboard/src/commonMain/kotlin/invotick/invoicemaker/feature/dashboard/presentation/DashboardScreen.kt:63-65"
    },
    {
     "match": "tap:analytics_dashboard_scr:BusinessListForDashboard.business_item_for_dashboard_1",
     "label": "Pick business (closes)",
     "kind": "backward",
     "to": "analytics_dashboard_scr",
     "source": "feature/dashboard/src/commonMain/kotlin/invotick/invoicemaker/feature/dashboard/presentation/components/BusinessListForDashboard.kt:111; feature/dashboard/src/commonMain/kotlin/invotick/invoicemaker/feature/dashboard/presentation/DashboardScreen.kt:76-78; feature/dashboard/src/commonMain/kotlin/invotick/invoicemaker/feature/dashboard/presentation/DashboardViewModel.kt:327-336"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes sheet)",
     "kind": "backward",
     "to": "analytics_dashboard_scr",
     "source": "feature/dashboard/src/commonMain/kotlin/invotick/invoicemaker/feature/dashboard/presentation/DashboardScreen.kt:63-65"
    }
   ],
   "source": "feature/dashboard/src/commonMain/kotlin/invotick/invoicemaker/feature/dashboard/presentation/DashboardScreen.kt:60-81"
  },
  "db_business_list_scr": {
   "dataScreen": "db_business_list_scr",
   "kind": "sheet",
   "parent": "dashboard",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "db_business_click",
     "states": []
    },
    {
     "key": "tap:db_business_list_scr:BusinessSelectionList.all_businesses",
     "states": []
    },
    {
     "key": "tap:db_business_list_scr:BusinessSelectionList.business_selection_item_1",
     "states": []
    },
    {
     "key": "tap:db_business_list_scr:BusinessSelectionList.edit_business",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "dashboard",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:176-178"
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe sheet down (closes)",
     "kind": "backward",
     "to": "dashboard",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:176-178"
    },
    {
     "match": "db_business_click",
     "label": "Close",
     "kind": "backward",
     "to": "dashboard",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/business/BusinessSelectionList.kt:59-63; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:202"
    },
    {
     "match": "tap:db_business_list_scr:BusinessSelectionList.all_businesses",
     "label": "All Businesses (closes)",
     "kind": "backward",
     "to": "dashboard",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/business/BusinessSelectionList.kt:101; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:191-195"
    },
    {
     "match": "tap:db_business_list_scr:BusinessSelectionList.business_selection_item_1",
     "label": "Pick business (closes)",
     "kind": "backward",
     "to": "dashboard",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/business/BusinessSelectionList.kt:193; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:188-190; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListViewModel.kt:985"
    },
    {
     "match": "tap:db_business_list_scr:BusinessSelectionList.edit_business",
     "label": "Edit business (sheet closes first)",
     "kind": "forward",
     "to": "edit_business",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/business/BusinessSelectionList.kt:346; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:197-201; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:612-614"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes sheet)",
     "kind": "backward",
     "to": "dashboard",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:176-178"
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:173-205"
  },
  "discount_scr": {
   "dataScreen": "discount_scr",
   "kind": "sheet",
   "parent": "create_inv_scr",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "label:%",
     "states": []
    },
    {
     "key": "tap:discount_scr:TextFiedl.invotick_clickable_text_field_2",
     "states": []
    },
    {
     "key": "label:Select discount type",
     "states": []
    },
    {
     "key": "tap:discount_scr:DiscountScreen.select_discount_type_1",
     "states": []
    },
    {
     "key": "dicount_scr_close",
     "states": []
    },
    {
     "key": "discount_add_success",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:61)",
     "events": [
      "dicount_scr_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:61)",
     "events": [
      "dicount_scr_close#swipe"
     ]
    },
    {
     "match": "label:%",
     "label": "Discount value",
     "kind": "stay",
     "stay": "types the discount",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/discount/DiscountScreen.kt"
    },
    {
     "match": "re:^(tap:discount_scr:TextFiedl\\.invotick_clickable_text_field_2|label:Select\\ discount\\ type|tap:discount_scr:DiscountScreen\\.select_discount_type_1)$",
     "label": "Discount type (% / amount)",
     "kind": "stay",
     "stay": "opens the discount-type menu inline",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/discount/DiscountScreen.kt:187"
    },
    {
     "match": "dicount_scr_close",
     "label": "Close (X)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/discount/DiscountScreen.kt:95"
    },
    {
     "match": "discount_add_success",
     "label": "Save (closes; discount applied)",
     "kind": "conditional",
     "branches": [
      {
       "when": "value empty/invalid or larger than the amount (button disabled / refused with a message)",
       "to": "discount_scr"
      },
      {
       "when": "valid",
       "to": "create_inv_scr",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/discount/navigation/DiscountNavigation.kt:46"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:80",
     "events": [
      "dicount_scr_close#scrim_or_back"
     ]
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:61)"
  },
  "edit_business": {
   "dataScreen": "edit_business",
   "kind": "screen",
   "parent": "business_details_scr",
   "pictured": true,
   "states": [
    "form"
   ],
   "controls": [
    {
     "key": "tap:edit_business:LogoSelector.logo_selector_1",
     "states": []
    },
    {
     "key": "label:Business Name · Enter your legal business name as registered",
     "states": []
    },
    {
     "key": "tap:edit_business:business_form.toggle_details",
     "states": []
    },
    {
     "key": "label:Short Name",
     "states": []
    },
    {
     "key": "label:License Number",
     "states": []
    },
    {
     "key": "label:Business Number",
     "states": []
    },
    {
     "key": "label:Default category · Arrow drop down",
     "states": []
    },
    {
     "key": "nolabel@28,973,692,1071",
     "states": []
    },
    {
     "key": "nolabel@28,1080,692,1178",
     "states": []
    },
    {
     "key": "label:Website",
     "states": []
    },
    {
     "key": "nolabel@28,1344,692,1442",
     "states": []
    },
    {
     "key": "label:Address line 2",
     "states": []
    },
    {
     "key": "nolabel@28,1558,356,1561",
     "states": []
    },
    {
     "key": "label:State/Province",
     "states": []
    },
    {
     "key": "business_form_screen_close",
     "states": []
    },
    {
     "key": "tap:edit_business:Update",
     "states": []
    },
    {
     "key": "tap:edit_business:business_form.select_category",
     "states": []
    }
   ],
   "points": [
    {
     "match": "tap:edit_business:LogoSelector.logo_selector_1",
     "label": "Select Business Logo",
     "kind": "forward",
     "to": "business_form_choose_logo_sheet",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:431"
    },
    {
     "match": "re:^(label:Business\\ Name\\ ·\\ Enter\\ your\\ legal\\ business\\ name\\ as\\ registered|label:Short\\ Name|label:License\\ Number|label:Business\\ Number|nolabel@28,973,692,1071|nolabel@28,1080,692,1178|label:Website|nolabel@28,1344,692,1442|label:Address\\ line\\ 2|nolabel@28,1558,356,1561|label:State/Province)$",
     "label": "Business form text fields (type)",
     "kind": "stay",
     "stay": "types text",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:176"
    },
    {
     "match": "tap:edit_business:business_form.toggle_details",
     "label": "Show Less / More Details",
     "kind": "stay",
     "stay": "collapses/expands the extra fields",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:460"
    },
    {
     "match": "re:^(tap:edit_business:business_form\\.select_category|label:Default\\ category\\ ·\\ Arrow\\ drop\\ down)$",
     "label": "Business category field",
     "kind": "forward",
     "to": "off:business_form_business_category_sheet",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:476"
    },
    {
     "match": "business_form_screen_close",
     "label": "Back arrow",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from Business details",
       "to": "business_details_scr",
       "back": true
      },
      {
       "when": "opened from the drawer or invoice list",
       "to": "dashboard",
       "back": true
      }
     ],
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:117"
    },
    {
     "match": "tap:edit_business:Update",
     "label": "Save",
     "kind": "conditional",
     "branches": [
      {
       "when": "name empty (button disabled)",
       "to": "edit_business"
      },
      {
       "when": "opened from Business details",
       "to": "business_details_scr"
      },
      {
       "when": "opened from the drawer or invoice list",
       "to": "dashboard"
      }
     ],
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:134"
    },
    {
     "match": "@system_back",
     "label": "Android back (no interception)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from Business details",
       "to": "business_details_scr",
       "back": true
      },
      {
       "when": "opened from the drawer or invoice list",
       "to": "dashboard",
       "back": true
      }
     ],
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/navigation/BusinessNavigation.kt:110"
    }
   ],
   "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/navigation/BusinessNavigation.kt:104 (screen name composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:1181)"
  },
  "edit_inv_scr": {
   "dataScreen": "edit_inv_scr",
   "kind": "screen",
   "parent": "saved_inv_scr",
   "pictured": true,
   "states": [
    "discard-dialog",
    "filled"
   ],
   "controls": [
    {
     "key": "tap:edit_inv_scr:AdaptiveHeaderZone.expand_1",
     "states": []
    },
    {
     "key": "create_inv_add_item_click",
     "states": []
    },
    {
     "key": "tap:edit_inv_scr:ItemPaymentCard.item_info_row_5",
     "states": []
    },
    {
     "key": "tap:edit_inv_scr:ItemPaymentCard.items_list_4",
     "states": []
    },
    {
     "key": "create_inv_discount_click",
     "states": []
    },
    {
     "key": "create_inv_tax_click",
     "states": []
    },
    {
     "key": "create_inv_shipping_click",
     "states": []
    },
    {
     "key": "tap:edit_inv_scr:InvoiceScreen.invoice_content_1",
     "states": []
    },
    {
     "key": "create_inv_preview_click",
     "states": []
    },
    {
     "key": "create_inv_saved_click",
     "states": []
    },
    {
     "key": "invoice_screen_close",
     "states": []
    }
   ],
   "points": [
    {
     "match": "tap:edit_inv_scr:AdaptiveHeaderZone.expand_1",
     "label": "Compact header (expand)",
     "kind": "stay",
     "stay": "expands the header back to full cards",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:1528"
    },
    {
     "match": "create_inv_add_item_click",
     "label": "Add Item",
     "kind": "forward",
     "to": "item_form_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:1569"
    },
    {
     "match": "re:^(tap:edit_inv_scr:ItemPaymentCard\\.item_info_row_5|tap:edit_inv_scr:ItemPaymentCard\\.items_list_4)$",
     "label": "Item line (edit item)",
     "kind": "forward",
     "to": "invoice_item_form",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:1607"
    },
    {
     "match": "create_inv_discount_click",
     "label": "Discount",
     "kind": "forward",
     "to": "discount_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:1576"
    },
    {
     "match": "create_inv_tax_click",
     "label": "Tax",
     "kind": "forward",
     "to": "tax_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:1583"
    },
    {
     "match": "create_inv_shipping_click",
     "label": "Shipping",
     "kind": "forward",
     "to": "shipping_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:1590"
    },
    {
     "match": "tap:edit_inv_scr:InvoiceScreen.invoice_content_1",
     "label": "Currency pill (USD)",
     "kind": "conditional",
     "branches": [
      {
       "when": "currency locked by the client (stays, 'Currency is locked' message)",
       "to": "edit_inv_scr"
      },
      {
       "when": "otherwise",
       "to": "invoice_currency"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:1619"
    },
    {
     "match": "create_inv_preview_click",
     "label": "Preview",
     "kind": "forward",
     "to": "off:invoice_preview_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:772"
    },
    {
     "match": "create_inv_saved_click",
     "label": "Save",
     "kind": "conditional",
     "branches": [
      {
       "when": "nothing changed and not a draft (button is dimmed (disabled))",
       "to": "edit_inv_scr"
      },
      {
       "when": "not premium and save gate on",
       "to": "ad_dialog_shown"
      },
      {
       "when": "premium or gate off; valid",
       "to": "saved_inv_scr"
      },
      {
       "when": "validation fails (stays, field marked)",
       "to": "edit_inv_scr"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:1687"
    },
    {
     "match": "invoice_screen_close",
     "label": "Back arrow",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from a saved invoice (unsaved item/payment edits are saved first)",
       "to": "saved_inv_scr",
       "back": true
      },
      {
       "when": "opened from the invoice list (unsaved item/payment edits are saved first)",
       "to": "dashboard",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/edit/EditInvoiceViewModel.kt:1062"
    },
    {
     "match": "@system_back",
     "label": "Android back",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from a saved invoice (unsaved item/payment edits are saved first)",
       "to": "saved_inv_scr",
       "back": true
      },
      {
       "when": "opened from the invoice list (unsaved item/payment edits are saved first)",
       "to": "dashboard",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:546",
     "events": [
      "invoice_screen_close#back_press"
     ]
    }
   ],
   "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/InvoiceDocNavigation.kt:151"
  },
  "estimate_scr": {
   "dataScreen": "estimate_scr",
   "kind": "screen",
   "parent": "dashboard",
   "pictured": true,
   "states": [
    "empty",
    "filled"
   ],
   "controls": [
    {
     "key": "estimate_list_screen_close",
     "states": []
    },
    {
     "key": "tap:estimate_scr:EstimateListScreen.contact_support_4",
     "states": []
    },
    {
     "key": "db_create_estimate_fab_click",
     "states": []
    },
    {
     "key": "label:Invoice",
     "states": []
    },
    {
     "key": "label:Estimate",
     "states": []
    },
    {
     "key": "label:Analytics",
     "states": []
    },
    {
     "key": "label:Ledgers",
     "states": []
    },
    {
     "key": "label:Tools",
     "states": []
    },
    {
     "key": "tap:estimate_scr:EstimateListScreen.revenue_overview_card_8",
     "states": [
      "filled"
     ]
    },
    {
     "key": "label:All",
     "states": [
      "filled"
     ]
    },
    {
     "key": "label:Expired",
     "states": [
      "filled"
     ]
    },
    {
     "key": "label:Issued · 1",
     "states": [
      "filled"
     ]
    },
    {
     "key": "label:Draft · 1",
     "states": [
      "filled"
     ]
    },
    {
     "key": "label:Converted",
     "states": [
      "filled"
     ]
    },
    {
     "key": "tap:estimate_scr:EstimateListScreen.multi_select_2",
     "states": [
      "filled"
     ]
    },
    {
     "key": "tap:estimate_scr:EstimateListScreen.estimate_item",
     "states": [
      "filled"
     ]
    }
   ],
   "points": [
    {
     "match": "estimate_list_screen_close",
     "label": "Open menu (drawer)",
     "kind": "conditional",
     "branches": [
      {
       "when": "normal mode",
       "to": "drawer",
       "back": true
      },
      {
       "when": "multi-select mode: icon cancels selection",
       "to": "estimate_scr"
      }
     ],
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/list/EstimateListScreen.kt:243,260-265; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/EstimateDocNavigation.kt:71; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:623-630"
    },
    {
     "match": "tap:estimate_scr:EstimateListScreen.contact_support_4",
     "label": "Contact Support → feedback dialog",
     "kind": "forward",
     "to": "feedback_dialog",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/list/EstimateListScreen.kt:354-355,440"
    },
    {
     "match": "db_create_estimate_fab_click",
     "label": "Create Estimate (FAB)",
     "kind": "forward",
     "to": "create_estimate",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/list/EstimateListScreen.kt:386-387,176; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/EstimateDocNavigation.kt:59-63"
    },
    {
     "match": "label:Invoice",
     "label": "Invoice tab",
     "kind": "forward",
     "to": "dashboard",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:978 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "label:Estimate",
     "label": "Estimate tab (already here)",
     "kind": "stay",
     "stay": "Current tab: handleBottomNavigation returns without navigating",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:969"
    },
    {
     "match": "label:Analytics",
     "label": "Analytics tab",
     "kind": "forward",
     "to": "analytics_dashboard_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:970 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "label:Ledgers",
     "label": "Ledgers tab",
     "kind": "forward",
     "to": "client_ledger_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:1001 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "label:Tools",
     "label": "Tools tab",
     "kind": "forward",
     "to": "tools_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:1009 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "tap:estimate_scr:EstimateListScreen.revenue_overview_card_8",
     "label": "Business name → business sheet",
     "kind": "forward",
     "to": "off:estimate_list_business_sheet",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/list/EstimateListScreen.kt:997,563,212"
    },
    {
     "match": "re:^label:(All|Expired|Issued · \\d+|Draft · \\d+|Converted)$",
     "label": "Status filter chip",
     "kind": "stay",
     "stay": "Filters estimates by status",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/list/EstimateListScreen.kt:590"
    },
    {
     "match": "tap:estimate_scr:EstimateListScreen.estimate_item",
     "label": "Open estimate row",
     "kind": "conditional",
     "branches": [
      {
       "when": "estimate is a draft",
       "to": "off:estimate_edit_scr"
      },
      {
       "when": "any other status",
       "to": "off:save_estimate_scr"
      }
     ],
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/list/EstimateListScreen.kt:668-681,177-183; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/EstimateDocNavigation.kt:64-68"
    },
    {
     "match": "tap:estimate_scr:EstimateListScreen.multi_select_2",
     "label": "Multi-select",
     "kind": "stay",
     "stay": "Enters multi-select mode",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/list/EstimateListScreen.kt:318-319"
    },
    {
     "match": "@system_back",
     "label": "Android back (pops the tab)",
     "kind": "conditional",
     "branches": [
      {
       "when": "normal case: tabs are pushed over the Invoices list",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "app was opened straight into a new invoice (first run) and the Invoices list is not underneath",
       "to": "create_inv_scr",
       "back": true
      }
     ],
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:993-998 (no BackHandler; NavHost pops)"
    }
   ],
   "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/EstimateDocNavigation.kt:50"
  },
  "expense_list": {
   "dataScreen": "expense_list",
   "kind": "screen",
   "parent": "tools_scr",
   "pictured": true,
   "states": [
    "empty",
    "filled"
   ],
   "controls": [
    {
     "key": "tap:expense_list:ExpenseEmptyStateComponents.add_first_expense_1",
     "states": [
      "empty"
     ]
    },
    {
     "key": "tap:expense_list:ExpenseListScreen.arrow_back_1",
     "states": []
    },
    {
     "key": "tap:expense_list:ExpenseListScreen.multi_select_3",
     "states": []
    },
    {
     "key": "label:Add Expense",
     "states": []
    },
    {
     "key": "tap:expense_list:ExpenseCardComponents.expense_overview_card_1",
     "states": [
      "filled"
     ]
    },
    {
     "key": "label:All Time · Arrow drop down",
     "states": [
      "filled"
     ]
    },
    {
     "key": "label:Recent · Arrow drop down",
     "states": [
      "filled"
     ]
    },
    {
     "key": "label:All",
     "states": [
      "filled"
     ]
    },
    {
     "key": "tap:expense_list:ExpenseListComponents.expense_list_item_1",
     "states": [
      "filled"
     ]
    },
    {
     "key": "tap:expense_list:ExpenseListComponents.more_options_2",
     "states": [
      "filled"
     ]
    }
   ],
   "points": [
    {
     "match": "tap:expense_list:ExpenseEmptyStateComponents.add_first_expense_1",
     "label": "Add First Expense",
     "kind": "forward",
     "to": "create_expense_scr",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/expenseList/components/ExpenseEmptyStateComponents.kt:137; feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/expenseList/ExpenseListScreen.kt:274; feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/navigation/ExpenseNavigation.kt:62-64"
    },
    {
     "match": "tap:expense_list:ExpenseListScreen.arrow_back_1",
     "label": "Back arrow → Invoices graph start (not Tools)",
     "kind": "conditional",
     "branches": [
      {
       "when": "multi-select mode: cancels selection",
       "to": "expense_list"
      },
      {
       "when": "normal launch",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "app was opened straight into a new invoice (first run) and the Invoices list is not underneath (graph start is Create Invoice)",
       "to": "create_inv_scr",
       "back": true
      }
     ],
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/expenseList/ExpenseListScreen.kt:188-189,96-102; feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/navigation/ExpenseNavigation.kt:68-70; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:652-656"
    },
    {
     "match": "tap:expense_list:ExpenseListScreen.multi_select_3",
     "label": "Multi-select",
     "kind": "stay",
     "stay": "Enters multi-select mode",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/expenseList/ExpenseListScreen.kt:235-236"
    },
    {
     "match": "label:Add Expense",
     "label": "Add Expense (FAB)",
     "kind": "forward",
     "to": "create_expense_scr",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/expenseList/ExpenseListScreen.kt:114; feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/navigation/ExpenseNavigation.kt:62-64"
    },
    {
     "match": "tap:expense_list:ExpenseCardComponents.expense_overview_card_1",
     "label": "Business name → business sheet",
     "kind": "forward",
     "to": "off:expense_list_business_select",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/expenseList/components/ExpenseCardComponents.kt:84; feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/expenseList/ExpenseListScreen.kt:295,467; feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/expenseList/components/BusinessSelectionComponents.kt:52"
    },
    {
     "match": "label:All Time · Arrow drop down",
     "label": "Period filter",
     "kind": "stay",
     "stay": "Opens the period filter dialog in place",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/expenseList/ExpenseListScreen.kt:341,445"
    },
    {
     "match": "label:Recent · Arrow drop down",
     "label": "Sort",
     "kind": "stay",
     "stay": "Opens the sort dialog in place",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/expenseList/ExpenseListScreen.kt:355"
    },
    {
     "match": "label:All",
     "label": "Category chip",
     "kind": "stay",
     "stay": "Filters by category",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/expenseList/ExpenseListScreen.kt:363-367"
    },
    {
     "match": "tap:expense_list:ExpenseListComponents.expense_list_item_1",
     "label": "Open expense",
     "kind": "forward",
     "to": "off:edit_expense",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/expenseList/components/ExpenseListComponents.kt:177; feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/expenseList/ExpenseListScreen.kt:403-408; feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/navigation/ExpenseNavigation.kt:65-67"
    },
    {
     "match": "tap:expense_list:ExpenseListComponents.more_options_2",
     "label": "More options",
     "kind": "stay",
     "stay": "Opens a dropdown menu inline",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/expenseList/components/ExpenseListComponents.kt:328"
    },
    {
     "match": "@system_back",
     "label": "Android back (NavHost pops — differs from the arrow)",
     "kind": "backward",
     "to": "tools_scr",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/navigation/ExpenseNavigation.kt:59 (no BackHandler)"
    }
   ],
   "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/navigation/ExpenseNavigation.kt:59"
  },
  "invoice_currency": {
   "dataScreen": "invoice_currency",
   "kind": "sheet",
   "parent": "create_inv_scr",
   "pictured": true,
   "states": [
    "list"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "label:Search · Search currencies...",
     "states": []
    },
    {
     "key": "tap:invoice_currency:CurrencyBottomSheetScreen.popular_currency_chip_1",
     "states": []
    },
    {
     "key": "tap:invoice_currency:CurrencyBottomSheetScreen.currency_list_item_2",
     "states": []
    },
    {
     "key": "currency_bottom_sheet_screen_close",
     "states": []
    },
    {
     "key": "tap:invoice_currency:Done",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36",
     "events": [
      "currency_bottom_sheet_screen_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36",
     "events": [
      "currency_bottom_sheet_screen_close#swipe"
     ]
    },
    {
     "match": "label:Search · Search currencies...",
     "label": "Search",
     "kind": "stay",
     "stay": "types a search filter",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/currency/CurrencyBottomSheetScreen.kt"
    },
    {
     "match": "tap:invoice_currency:CurrencyBottomSheetScreen.popular_currency_chip_1",
     "label": "Popular currency chip (closes; applied)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/currency/CurrencyBottomSheetScreen.kt:215"
    },
    {
     "match": "tap:invoice_currency:CurrencyBottomSheetScreen.currency_list_item_2",
     "label": "Currency row (closes; applied)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/currency/CurrencyBottomSheetScreen.kt:235"
    },
    {
     "match": "currency_bottom_sheet_screen_close",
     "label": "Back arrow",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/currency/CurrencyBottomSheetScreen.kt:107"
    },
    {
     "match": "tap:invoice_currency:Done",
     "label": "Done (closes; applied)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/currency/CurrencyBottomSheetScreen.kt:115"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:80",
     "events": [
      "currency_bottom_sheet_screen_close#scrim_or_back"
     ]
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:59)"
  },
  "invoice_item_form": {
   "dataScreen": "invoice_item_form",
   "kind": "sheet",
   "parent": "create_inv_scr",
   "pictured": true,
   "states": [
    "edit"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "nolabel@28,265,692,363",
     "states": []
    },
    {
     "key": "nolabel@28,371,356,469",
     "states": []
    },
    {
     "key": "nolabel@364,371,692,469",
     "states": []
    },
    {
     "key": "invoice_item_discount_row",
     "states": []
    },
    {
     "key": "invoice_item_tax_row",
     "states": []
    },
    {
     "key": "invoice_item_net_price_row",
     "states": []
    },
    {
     "key": "tap:invoice_item_form:InvoiceItemScreen.invoice_item_content_1",
     "states": []
    },
    {
     "key": "tap:invoice_item_form:InvoiceItemScreen.delete_item_2",
     "states": []
    },
    {
     "key": "invoice_item_screen_close",
     "states": []
    },
    {
     "key": "tap:invoice_item_form:Update",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36",
     "events": [
      "invoice_item_screen_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36",
     "events": [
      "invoice_item_screen_close#swipe"
     ]
    },
    {
     "match": "re:^(nolabel@28,265,692,363|nolabel@28,371,356,469|nolabel@364,371,692,469)$",
     "label": "Item name / unit price / quantity (type)",
     "kind": "stay",
     "stay": "types text",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/invoiceItem/InvoiceItemScreen.kt:346"
    },
    {
     "match": "invoice_item_discount_row",
     "label": "Discount row",
     "kind": "forward",
     "to": "off:invoice_item_discount_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/invoiceItem/InvoiceItemScreen.kt:399"
    },
    {
     "match": "invoice_item_tax_row",
     "label": "Tax row",
     "kind": "forward",
     "to": "off:invoice_item_tax_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/invoiceItem/InvoiceItemScreen.kt:421"
    },
    {
     "match": "invoice_item_net_price_row",
     "label": "Net Price row",
     "kind": "stay",
     "stay": "none - display only (no click handler)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/invoiceItem/InvoiceItemScreen.kt:428"
    },
    {
     "match": "tap:invoice_item_form:InvoiceItemScreen.invoice_item_content_1",
     "label": "Show More Details",
     "kind": "stay",
     "stay": "expands/collapses category, unit type, description",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/invoiceItem/InvoiceItemScreen.kt:445"
    },
    {
     "match": "tap:invoice_item_form:InvoiceItemScreen.delete_item_2",
     "label": "Delete Item (closes; line removed)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/invoiceItem/InvoiceItemScreen.kt:498"
    },
    {
     "match": "invoice_item_screen_close",
     "label": "Close (X)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/invoiceItem/InvoiceItemScreen.kt:164"
    },
    {
     "match": "tap:invoice_item_form:Update",
     "label": "Save (closes; line updated)",
     "kind": "conditional",
     "branches": [
      {
       "when": "name or price invalid (stays with an error)",
       "to": "invoice_item_form"
      },
      {
       "when": "valid",
       "to": "create_inv_scr",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/invoiceItem/InvoiceItemScreen.kt:174"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:80",
     "events": [
      "invoice_item_screen_close#scrim_or_back"
     ]
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:66)"
  },
  "item_form_scr": {
   "dataScreen": "item_form_scr",
   "kind": "sheet",
   "parent": "create_inv_scr",
   "pictured": true,
   "states": [
    "form-empty",
    "form-error",
    "form-filled",
    "list"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "label:Product Name · Enter product name · The name that appears on the invoice line",
     "states": [
      "form-empty"
     ]
    },
    {
     "key": "label:$ · Unit Price",
     "states": [
      "form-empty"
     ]
    },
    {
     "key": "nolabel@364,405,692,503",
     "states": [
      "form-empty",
      "form-error",
      "form-filled"
     ]
    },
    {
     "key": "item_form_more_details_toggle",
     "states": [
      "form-empty",
      "form-error",
      "form-filled"
     ]
    },
    {
     "key": "create_product_screen_close",
     "states": [
      "form-empty",
      "form-error",
      "form-filled"
     ]
    },
    {
     "key": "add_item_added",
     "states": [
      "form-empty",
      "form-error",
      "form-filled"
     ]
    },
    {
     "key": "label:Product Name · Enter product name · Enter the item's name",
     "states": [
      "form-error"
     ]
    },
    {
     "key": "label:$ · Unit Price · Enter a price",
     "states": [
      "form-error"
     ]
    },
    {
     "key": "label:Product Name · The name that appears on the invoice line",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "label:$",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "item_form_discount_row",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "item_form_tax_row",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "item_form_net_price_row",
     "states": [
      "form-filled"
     ]
    },
    {
     "key": "label:Search · Search products...",
     "states": [
      "list"
     ]
    },
    {
     "key": "tap:item_form_scr:ProductListScreen.product_item_4",
     "states": [
      "list"
     ]
    },
    {
     "key": "tap:item_form_scr:ProductListScreen.more_options_5",
     "states": [
      "list"
     ]
    },
    {
     "key": "product_list_screen_close",
     "states": [
      "list"
     ]
    },
    {
     "key": "tap:item_form_scr:ProductListScreen.enter_selection_mode_3",
     "states": [
      "list"
     ]
    },
    {
     "key": "tap:item_form_scr:Create Product",
     "states": [
      "list"
     ]
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36",
     "events": [
      "product_list_screen_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36",
     "events": [
      "product_list_screen_close#swipe"
     ]
    },
    {
     "match": "re:^(label:Product\\ Name\\ ·\\ Enter\\ product\\ name\\ ·\\ The\\ name\\ that\\ appears\\ on\\ the\\ invoice\\ line|label:\\$\\ ·\\ Unit\\ Price|nolabel@364,405,692,503|label:Product\\ Name\\ ·\\ Enter\\ product\\ name\\ ·\\ Enter\\ the\\ item's\\ name|label:\\$\\ ·\\ Unit\\ Price\\ ·\\ Enter\\ a\\ price|label:Product\\ Name\\ ·\\ The\\ name\\ that\\ appears\\ on\\ the\\ invoice\\ line|label:\\$|label:Search\\ ·\\ Search\\ products\\.\\.\\.)$",
     "label": "Name / price / quantity / search fields (type)",
     "kind": "stay",
     "stay": "types text",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:353"
    },
    {
     "match": "item_form_more_details_toggle",
     "label": "Show More Details",
     "kind": "stay",
     "stay": "expands/collapses category, unit type, description",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:470"
    },
    {
     "match": "create_product_screen_close",
     "label": "Close (X) on the form",
     "kind": "conditional",
     "branches": [
      {
       "when": "form was opened from the product list (back to the list page)",
       "to": "item_form_scr"
      },
      {
       "when": "form is the sheet's first page (sheet closes)",
       "to": "create_inv_scr",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/productBottomSheetNavigation.kt:53"
    },
    {
     "match": "add_item_added",
     "label": "Add (closes; line added to invoice)",
     "kind": "conditional",
     "branches": [
      {
       "when": "name or price missing (stays, errors shown (form-error))",
       "to": "item_form_scr"
      },
      {
       "when": "valid",
       "to": "create_inv_scr",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:185"
    },
    {
     "match": "item_form_discount_row",
     "label": "Discount row",
     "kind": "forward",
     "to": "create_product_discount_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:425"
    },
    {
     "match": "item_form_tax_row",
     "label": "Tax row",
     "kind": "forward",
     "to": "create_product_tax_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:447"
    },
    {
     "match": "item_form_net_price_row",
     "label": "Net Price row",
     "kind": "stay",
     "stay": "none - display only (no click handler)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:454"
    },
    {
     "match": "tap:item_form_scr:ProductListScreen.product_item_4",
     "label": "Pick a product",
     "kind": "stay",
     "stay": "opens that product in the form page of this sheet (then Add puts it on the invoice)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/productBottomSheetNavigation.kt:30"
    },
    {
     "match": "tap:item_form_scr:ProductListScreen.more_options_5",
     "label": "More options (row)",
     "kind": "stay",
     "stay": "opens Edit/Delete menu inline",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/list/ProductListScreen.kt:566"
    },
    {
     "match": "product_list_screen_close",
     "label": "Close (X) on the list",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/list/ProductListScreen.kt:141"
    },
    {
     "match": "tap:item_form_scr:ProductListScreen.enter_selection_mode_3",
     "label": "Enter selection mode",
     "kind": "stay",
     "stay": "turns on multi-select for deleting products",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/list/ProductListScreen.kt:187"
    },
    {
     "match": "tap:item_form_scr:Create Product",
     "label": "Create Product",
     "kind": "stay",
     "stay": "switches this sheet to the empty Add Product form (form-empty state)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/productBottomSheetNavigation.kt:33"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:80",
     "events": [
      "product_list_screen_close#scrim_or_back"
     ]
    },
    {
     "match": "@category_field",
     "label": "Category (\"More details\" ke andar)",
     "kind": "forward",
     "to": "create_product_category_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:269"
    },
    {
     "match": "@unit_type_field",
     "label": "Unit type (\"More details\" ke andar)",
     "kind": "forward",
     "to": "create_product_unit_type_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/item/create/CreateProductScreen.kt:290"
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:60)"
  },
  "login_scr": {
   "dataScreen": "login_scr",
   "kind": "screen",
   "parent": "splash_scr",
   "pictured": true,
   "states": [
    "empty",
    "error"
   ],
   "controls": [
    {
     "key": "label:Email · Enter your email",
     "states": [
      "empty"
     ]
    },
    {
     "key": "label:Password key · Enter your password · Show password · At least 8 characters",
     "states": [
      "empty"
     ]
    },
    {
     "key": "tap:login_scr:TextFiedl.password_text_field_3",
     "states": []
    },
    {
     "key": "login_forget_pass_click",
     "states": []
    },
    {
     "key": "login_with_email",
     "states": []
    },
    {
     "key": "continue_with_google_click",
     "states": []
    },
    {
     "key": "login_register_click",
     "states": []
    },
    {
     "key": "label:Email",
     "states": [
      "error"
     ]
    },
    {
     "key": "label:Password key · Show password · At least 8 characters",
     "states": [
      "error"
     ]
    }
   ],
   "points": [
    {
     "match": "label:Email · Enter your email",
     "label": "Email field",
     "kind": "stay",
     "stay": "Types email",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/login/LoginScreen.kt:230"
    },
    {
     "match": "label:Password key · Enter your password · Show password · At least 8 characters",
     "label": "Password field",
     "kind": "stay",
     "stay": "Types password",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/login/LoginScreen.kt:248"
    },
    {
     "match": "tap:login_scr:TextFiedl.password_text_field_3",
     "label": "Show password",
     "kind": "stay",
     "stay": "Toggles password visibility",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/TextFiedl.kt:849"
    },
    {
     "match": "login_forget_pass_click",
     "label": "Forgot password?",
     "kind": "forward",
     "to": "forgot_password_scr",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/login/LoginScreen.kt:269-276; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:92"
    },
    {
     "match": "login_with_email",
     "label": "Login",
     "kind": "conditional",
     "branches": [
      {
       "when": "invalid fields / wrong credentials (error state)",
       "to": "login_scr"
      },
      {
       "when": "email not verified (HTTP 403)",
       "to": "otp_scr"
      },
      {
       "when": "signed in",
       "to": "dashboard"
      }
     ],
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/login/LoginScreen.kt:292-295,86-100; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/login/LoginViewModel.kt:522-526; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/AppNavHost.kt:388-397"
    },
    {
     "match": "continue_with_google_click",
     "label": "Continue with Google — Cancelled/failed sign-in returns to login_scr",
     "kind": "outside",
     "outside": "Google sign-in",
     "returnsTo": "dashboard",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/login/LoginScreen.kt:331-336; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/AppNavHost.kt:388-397"
    },
    {
     "match": "login_register_click",
     "label": "Register",
     "kind": "forward",
     "to": "register_acc_scr",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/login/LoginScreen.kt:382-383; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:91"
    },
    {
     "match": "label:Email",
     "label": "Email field (error state)",
     "kind": "stay",
     "stay": "Types email",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/login/LoginScreen.kt:230"
    },
    {
     "match": "label:Password key · Show password · At least 8 characters",
     "label": "Password field (error state)",
     "kind": "stay",
     "stay": "Types password",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/login/LoginScreen.kt:248"
    },
    {
     "match": "@system_back",
     "label": "Android back (no BackHandler; outer NavHost pops)",
     "kind": "conditional",
     "branches": [
      {
       "when": "reached from splash or sign-out (nothing underneath)",
       "outside": "Leaves the app (home screen)"
      },
      {
       "when": "reached from the drawer's Sign in",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "reached from Register's Login link",
       "to": "register_acc_scr",
       "back": true
      }
     ],
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/login/LoginScreen.kt:121-131; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/AppNavHost.kt:302-304,436-439"
    }
   ],
   "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:87"
  },
  "payment_method_scr": {
   "dataScreen": "payment_method_scr",
   "kind": "sheet",
   "parent": "create_inv_scr",
   "pictured": true,
   "states": [
    "list"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "label:Search · Search payments...",
     "states": []
    },
    {
     "key": "tap:payment_method_scr:paymentMethod_PaymentListScreen.payment_item_4",
     "states": []
    },
    {
     "key": "tap:payment_method_scr:paymentMethod_PaymentListScreen.more_options_5",
     "states": []
    },
    {
     "key": "payment_list_screen_close",
     "states": []
    },
    {
     "key": "tap:payment_method_scr:paymentMethod_PaymentListScreen.exit_selection_mode_3",
     "states": []
    },
    {
     "key": "tap:payment_method_scr:Add Payment",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:65)",
     "events": [
      "payment_list_screen_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:65)",
     "events": [
      "payment_list_screen_close#swipe"
     ]
    },
    {
     "match": "label:Search · Search payments...",
     "label": "Search",
     "kind": "stay",
     "stay": "types a search filter"
    },
    {
     "match": "tap:payment_method_scr:paymentMethod_PaymentListScreen.payment_item_4",
     "label": "Pick a payment method (closes; set on invoice)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/paymentMethod/PaymentListScreen.kt:244"
    },
    {
     "match": "tap:payment_method_scr:paymentMethod_PaymentListScreen.more_options_5",
     "label": "More options (row)",
     "kind": "stay",
     "stay": "opens Edit/Delete menu inline (edit/confirm dialogs stay in this sheet)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/paymentMethod/PaymentListScreen.kt:494"
    },
    {
     "match": "payment_list_screen_close",
     "label": "Close (X)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/paymentMethod/PaymentListScreen.kt:158"
    },
    {
     "match": "tap:payment_method_scr:paymentMethod_PaymentListScreen.exit_selection_mode_3",
     "label": "Selection mode",
     "kind": "stay",
     "stay": "toggles multi-select mode (id says exit; it is the selection-mode toggle)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/paymentMethod/PaymentListScreen.kt:203"
    },
    {
     "match": "tap:payment_method_scr:Add Payment",
     "label": "Create button",
     "kind": "stay",
     "stay": "opens the Add Payment Method dialog inside this sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/paymentMethod/PaymentListScreen.kt:228"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:80",
     "events": [
      "payment_list_screen_close#scrim_or_back"
     ]
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:65)"
  },
  "premium_scr": {
   "dataScreen": "premium_scr",
   "kind": "sheet",
   "parent": "dashboard",
   "pictured": true,
   "states": [
    "prices-loaded",
    "prices-loading"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "p_cross_click",
     "states": []
    },
    {
     "key": "p_no_ads_click",
     "states": []
    },
    {
     "key": "p_clean_pdf_click",
     "states": []
    },
    {
     "key": "p_own_footer_click",
     "states": []
    },
    {
     "key": "p_yealry_click",
     "states": []
    },
    {
     "key": "p_monthly_click",
     "states": []
    },
    {
     "key": "p_life_time_click",
     "states": []
    },
    {
     "key": "tap:premium_scr:PremiumPaywallSheet.checking_plans_6",
     "states": []
    },
    {
     "key": "tap:premium_scr:PremiumPaywallSheet.already_purchased",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside (closes paywall)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from Go Premium on the Invoices tab, or the drawer there",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "opened from the Save gate's ad-or-premium dialog on Create Invoice (dialog already closed)",
       "to": "create_inv_scr",
       "back": true
      },
      {
       "when": "opened from Send's ad-or-premium dialog or the footer on the saved invoice",
       "to": "saved_inv_scr",
       "back": true
      },
      {
       "when": "opened from the drawer on the Estimates tab",
       "to": "estimate_scr",
       "back": true
      }
     ],
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:888"
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe paywall down (closes)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from Go Premium on the Invoices tab, or the drawer there",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "opened from the Save gate's ad-or-premium dialog on Create Invoice (dialog already closed)",
       "to": "create_inv_scr",
       "back": true
      },
      {
       "when": "opened from Send's ad-or-premium dialog or the footer on the saved invoice",
       "to": "saved_inv_scr",
       "back": true
      },
      {
       "when": "opened from the drawer on the Estimates tab",
       "to": "estimate_scr",
       "back": true
      }
     ],
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:888"
    },
    {
     "match": "p_cross_click",
     "label": "Close (X)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from Go Premium on the Invoices tab, or the drawer there",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "opened from the Save gate's ad-or-premium dialog on Create Invoice (dialog already closed)",
       "to": "create_inv_scr",
       "back": true
      },
      {
       "when": "opened from Send's ad-or-premium dialog or the footer on the saved invoice",
       "to": "saved_inv_scr",
       "back": true
      },
      {
       "when": "opened from the drawer on the Estimates tab",
       "to": "estimate_scr",
       "back": true
      }
     ],
     "source": "feature/premium/src/commonMain/kotlin/invotick/invoicemaker/feature/premium/presentation/PremiumPaywallSheet.kt:373,112; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:895"
    },
    {
     "match": "re:^p_(no_ads|clean_pdf|own_footer)_click$",
     "label": "Feature card",
     "kind": "stay",
     "stay": "Records the tap only",
     "source": "feature/premium/src/commonMain/kotlin/invotick/invoicemaker/feature/premium/presentation/PremiumPaywallSheet.kt:597-599; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:899"
    },
    {
     "match": "re:^p_(yealry|monthly|life_time)_click$",
     "label": "Plan card",
     "kind": "stay",
     "stay": "Selects this plan",
     "source": "feature/premium/src/commonMain/kotlin/invotick/invoicemaker/feature/premium/presentation/PremiumPaywallSheet.kt:697-705,178"
    },
    {
     "match": "tap:premium_scr:PremiumPaywallSheet.checking_plans_6",
     "label": "Continue (shows 'Checking plans…' while prices load)",
     "kind": "conditional",
     "branches": [
      {
       "when": "plans loaded: Google Play purchase sheet; on success the paywall closes",
       "outside": "Google Play billing"
      },
      {
       "when": "plans failed to load: button becomes Retry",
       "to": "premium_scr"
      }
     ],
     "source": "feature/premium/src/commonMain/kotlin/invotick/invoicemaker/feature/premium/presentation/PremiumPaywallSheet.kt:891-892; feature/premium/src/commonMain/kotlin/invotick/invoicemaker/feature/premium/presentation/PremiumViewModel.kt:147-149"
    },
    {
     "match": "tap:premium_scr:PremiumPaywallSheet.already_purchased",
     "label": "Already have Premium?",
     "kind": "forward",
     "to": "off:already_have_premium_dialog",
     "source": "feature/premium/src/commonMain/kotlin/invotick/invoicemaker/feature/premium/presentation/PremiumPaywallSheet.kt:195-202,835"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes paywall)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from Go Premium on the Invoices tab, or the drawer there",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "opened from the Save gate's ad-or-premium dialog on Create Invoice (dialog already closed)",
       "to": "create_inv_scr",
       "back": true
      },
      {
       "when": "opened from Send's ad-or-premium dialog or the footer on the saved invoice",
       "to": "saved_inv_scr",
       "back": true
      },
      {
       "when": "opened from the drawer on the Estimates tab",
       "to": "estimate_scr",
       "back": true
      }
     ],
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:888"
    }
   ],
   "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:881-906"
  },
  "preview_invoice_scr": {
   "dataScreen": "preview_invoice_scr",
   "kind": "screen",
   "parent": "saved_inv_scr",
   "pictured": true,
   "states": [
    "chrome"
   ],
   "controls": [
    {
     "key": "preview_inv_template_click",
     "states": []
    },
    {
     "key": "preview_inv_back_click",
     "states": []
    },
    {
     "key": "label:Offline",
     "states": []
    },
    {
     "key": "preview_inv_create_clicked",
     "states": []
    }
   ],
   "points": [
    {
     "match": "preview_inv_template_click",
     "label": "Templates / Customize tabs (both tabs carry this one id)",
     "kind": "conditional",
     "branches": [
      {
       "when": "Templates tab: the templates panel",
       "to": "template_sheet"
      },
      {
       "when": "Customize tab: the six customise cards (stays here)"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:407; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:169"
    },
    {
     "match": "preview_inv_back_click",
     "label": "Back arrow",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from the saved invoice (Templates/Signature/Stamp): pushes a new Save",
       "to": "saved_inv_scr",
       "back": true
      },
      {
       "when": "opened from create/edit invoice",
       "to": "edit_inv_scr",
       "back": true
      },
      {
       "when": "otherwise",
       "to": "dashboard",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/PreviewInvoiceScreen.kt:631,635-637; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/PreviewInvoiceViewModel.kt:1258-1282; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/InvoiceDocNavigation.kt:221-238"
    },
    {
     "match": "label:Offline",
     "label": "Render-mode toggle (debug builds only)",
     "kind": "stay",
     "stay": "Cycles Offline HTML → Native → Online HTML",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/PreviewInvoiceScreen.kt:639-645"
    },
    {
     "match": "preview_inv_create_clicked",
     "label": "Save (dimmed until the design changed)",
     "kind": "conditional",
     "branches": [
      {
       "when": "a different template was picked: save-as-template dialog first",
       "to": "off:save_template_dialog"
      },
      {
       "when": "otherwise",
       "to": "saved_inv_scr"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/PreviewInvoiceScreen.kt:650-657; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/PreviewInvoiceViewModel.kt:113-130,379-404; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/InvoiceDocNavigation.kt:221-228"
    },
    {
     "match": "@customize_color",
     "label": "Customize → Color card",
     "kind": "forward",
     "to": "color_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:552; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:701",
     "events": [
      "preview_inv_customize_color_clic"
     ]
    },
    {
     "match": "@customize_header",
     "label": "Customize → Header card",
     "kind": "forward",
     "to": "header_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:558; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:709",
     "events": [
      "preview_inv_header_click"
     ]
    },
    {
     "match": "@customize_background",
     "label": "Customize → Background card",
     "kind": "forward",
     "to": "background_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:572; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:724",
     "events": [
      "preview_inv_select_bg_click"
     ]
    },
    {
     "match": "@customize_settings",
     "label": "Customize → Settings card",
     "kind": "forward",
     "to": "settings_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:578; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:769",
     "events": [
      "preview_inv_setting_click"
     ]
    },
    {
     "match": "@footer_button",
     "label": "Footer button on the page (round ×, or pencil for Premium; absent when the footer is switched off)",
     "kind": "conditional",
     "branches": [
      {
       "when": "free account: the paywall opens (Remove)",
       "to": "premium_scr"
      },
      {
       "when": "Premium account: 'Edit' / 'Add footer' opens the footer sheet",
       "to": "own_footer_sheet"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterPreviewHooks.kt:74; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterPreviewHooks.kt:75; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterPreviewHooks.kt:78",
     "events": [
      "invoice_preview_footer_remove",
      "invoice_preview_footer_edit"
     ]
    },
    {
     "match": "@system_back",
     "label": "Android back → Invoices list (differs from the arrow)",
     "kind": "backward",
     "to": "dashboard",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/PreviewInvoiceScreen.kt:154; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/InvoiceDocNavigation.kt:234-238"
    }
   ],
   "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/InvoiceDocNavigation.kt:205"
  },
  "received_invoice": {
   "dataScreen": "received_invoice",
   "kind": "screen",
   "parent": "splash_scr",
   "pictured": true,
   "states": [
    "approved",
    "error",
    "pending"
   ],
   "controls": [
    {
     "key": "tap:received_invoice:ReceivedInvoiceScreen.back_1",
     "states": []
    },
    {
     "key": "tap:received_invoice:ReceivedInvoiceScreen.download_pdf",
     "states": [
      "approved",
      "approved-small",
      "decided-by-other",
      "deciding",
      "decision-error",
      "declined",
      "loading",
      "note-open",
      "note-paid",
      "pending",
      "pending-small"
     ]
    },
    {
     "key": "tap:received_invoice:ReceivedInvoiceScreen.translate",
     "states": [
      "approved",
      "approved-small",
      "decided-by-other",
      "deciding",
      "decision-error",
      "declined",
      "loading",
      "note-open",
      "note-paid",
      "pending",
      "pending-small"
     ]
    },
    {
     "key": "label:Note for the sender (optional)",
     "states": [
      "note-open"
     ]
    },
    {
     "key": "tap:received_invoice:ReceivedInvoiceScreen.decline",
     "states": [
      "deciding",
      "decision-error",
      "note-open",
      "note-paid",
      "pending",
      "pending-small"
     ]
    },
    {
     "key": "tap:received_invoice:ReceivedInvoiceScreen.approve",
     "states": [
      "deciding",
      "decision-error",
      "note-open",
      "note-paid",
      "pending",
      "pending-small"
     ]
    },
    {
     "key": "tap:received_invoice:ReceivedInvoiceScreen.create_your_own_invoice_2",
     "states": [
      "approved",
      "approved-small",
      "decided-by-other",
      "declined",
      "error"
     ]
    },
    {
     "key": "tap:received_invoice:ReceivedInvoiceScreen.note_for_sender",
     "states": [
      "deciding",
      "decision-error",
      "note-paid",
      "pending",
      "pending-small"
     ]
    },
    {
     "key": "tap:received_invoice:ReceivedInvoiceScreen.i_ve_paid",
     "states": [
      "deciding",
      "decision-error",
      "note-open",
      "note-paid",
      "pending",
      "pending-small"
     ]
    },
    {
     "key": "tap:received_invoice:ReceivedInvoiceScreen.create_your_own_invoice_pending",
     "states": [
      "deciding",
      "decision-error",
      "note-open",
      "note-paid",
      "pending",
      "pending-small"
     ]
    }
   ],
   "points": [
    {
     "match": "tap:received_invoice:ReceivedInvoiceScreen.back_1",
     "label": "Back arrow",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from a shared link (dashboard placed underneath)",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "opened from Tools → Received Invoices",
       "to": "received_invoice_list",
       "back": true
      },
      {
       "when": "warm link while another screen was open",
       "to": "dashboard",
       "back": true
      }
     ],
     "source": "feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/ReceivedInvoiceScreen.kt:313,178; feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/ReceivedInvoiceViewModel.kt:67-69; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:702-722"
    },
    {
     "match": "tap:received_invoice:ReceivedInvoiceScreen.download_pdf",
     "label": "Download PDF",
     "kind": "stay",
     "stay": "Saves the PDF to Downloads, snackbar",
     "source": "feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/ReceivedInvoiceScreen.kt:482,210; feature/receivedInvoice/src/androidMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/SharedInvoicePdf.android.kt:36"
    },
    {
     "match": "tap:received_invoice:ReceivedInvoiceScreen.translate",
     "label": "Translate → language sheet",
     "kind": "forward",
     "to": "document_language_sheet",
     "source": "feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/ReceivedInvoiceScreen.kt:488,211,287"
    },
    {
     "match": "re:^(label:Note\\ for\\ the\\ sender\\ \\(optional\\)|tap:received_invoice:ReceivedInvoiceScreen\\.note_for_sender)$",
     "label": "Note field",
     "kind": "stay",
     "stay": "Types a note",
     "source": "feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/ReceivedInvoiceScreen.kt:557-566"
    },
    {
     "match": "tap:received_invoice:ReceivedInvoiceScreen.i_ve_paid",
     "label": "I've paid chip",
     "kind": "stay",
     "stay": "Appends \"I've paid.\" to the note",
     "source": "feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/ReceivedInvoiceScreen.kt:569"
    },
    {
     "match": "tap:received_invoice:ReceivedInvoiceScreen.decline",
     "label": "Decline",
     "kind": "stay",
     "stay": "Records the decision; screen shows the result",
     "source": "feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/ReceivedInvoiceScreen.kt:580,241; feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/ReceivedInvoiceViewModel.kt:72"
    },
    {
     "match": "tap:received_invoice:ReceivedInvoiceScreen.approve",
     "label": "Approve",
     "kind": "stay",
     "stay": "Records the decision; screen shows the result",
     "source": "feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/ReceivedInvoiceScreen.kt:587,240; feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/ReceivedInvoiceViewModel.kt:71"
    },
    {
     "match": "re:^tap:received_invoice:ReceivedInvoiceScreen\\.create_your_own_invoice_(2|pending)$",
     "label": "Create your own invoice — free (wired to Back: onCreateYourOwn defaults to onNavigateBack)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from a shared link (dashboard placed underneath)",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "opened from Tools → Received Invoices",
       "to": "received_invoice_list",
       "back": true
      },
      {
       "when": "warm link while another screen was open",
       "to": "dashboard",
       "back": true
      }
     ],
     "source": "feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/ReceivedInvoiceScreen.kt:255-263,95,150; feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/ReceivedInvoiceViewModel.kt:73; feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/navigation/ReceivedInvoiceNavigation.kt:64-69; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:702-722"
    },
    {
     "match": "@system_back",
     "label": "Android back (NavHost pops)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from a shared link (dashboard placed underneath)",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "opened from Tools → Received Invoices",
       "to": "received_invoice_list",
       "back": true
      },
      {
       "when": "warm link while another screen was open",
       "to": "dashboard",
       "back": true
      }
     ],
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:699 (no BackHandler in screen)"
    }
   ],
   "source": "feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/navigation/ReceivedInvoiceNavigation.kt:61"
  },
  "register_acc_scr": {
   "dataScreen": "register_acc_scr",
   "kind": "screen",
   "parent": "login_scr",
   "pictured": true,
   "states": [
    "default"
   ],
   "controls": [
    {
     "key": "reg_continue_with_email_click",
     "states": []
    },
    {
     "key": "Continue with Google",
     "states": []
    },
    {
     "key": "tap:register_acc_scr:RegisterGuestButton.continue_as_guest",
     "states": []
    },
    {
     "key": "regiter_acc_login_click",
     "states": []
    },
    {
     "key": "register_screen_close",
     "states": []
    }
   ],
   "points": [
    {
     "match": "reg_continue_with_email_click",
     "label": "Continue with Email",
     "kind": "forward",
     "to": "signup_scr",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/register/components/RegisterEmailButton.kt:24; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/register/RegisterScreen.kt:207,91; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:107-111"
    },
    {
     "match": "Continue with Google",
     "label": "Continue with Google — Cancelled/failed sign-in returns to register_acc_scr",
     "kind": "outside",
     "outside": "Google sign-in",
     "returnsTo": "dashboard",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/register/components/RegisterGoogleButton.kt:29; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/register/RegisterScreen.kt:212,89; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:112"
    },
    {
     "match": "tap:register_acc_scr:RegisterGuestButton.continue_as_guest",
     "label": "Continue as Guest",
     "kind": "forward",
     "to": "dashboard",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/register/RegisterScreen.kt:220,89; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:106,112; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/AppNavHost.kt:381-387"
    },
    {
     "match": "regiter_acc_login_click",
     "label": "Login",
     "kind": "forward",
     "to": "login_scr",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/register/components/RegisterFooter.kt:34; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/register/RegisterScreen.kt:230-233; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:113"
    },
    {
     "match": "register_screen_close",
     "label": "Back arrow (pops)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from Login's Register",
       "to": "login_scr",
       "back": true
      },
      {
       "when": "opened from the drawer's Sign up",
       "to": "dashboard",
       "back": true
      }
     ],
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/register/RegisterScreen.kt:107,118; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:114"
    },
    {
     "match": "@system_back",
     "label": "Android back (pops)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from Login's Register",
       "to": "login_scr",
       "back": true
      },
      {
       "when": "opened from the drawer's Sign up",
       "to": "dashboard",
       "back": true
      }
     ],
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:103 (no BackHandler)"
    }
   ],
   "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:103"
  },
  "saved_inv_scr": {
   "dataScreen": "saved_inv_scr",
   "kind": "screen",
   "parent": "dashboard",
   "pictured": true,
   "states": [
    "sent"
   ],
   "controls": [
    {
     "key": "tap:saved_inv_scr:InvoiceDetailsComponents.action_templates",
     "states": []
    },
    {
     "key": "save_inv_download_click",
     "states": []
    },
    {
     "key": "saved_inv_signature_click",
     "states": []
    },
    {
     "key": "saved_inv_stamp_click",
     "states": []
    },
    {
     "key": "saved_inv_more_click",
     "states": []
    },
    {
     "key": "saved_inv_back_click",
     "states": []
    },
    {
     "key": "label:Offline",
     "states": []
    },
    {
     "key": "saved_inv_translate_btn_click",
     "states": []
    },
    {
     "key": "saved_inv_send_invoice",
     "states": []
    },
    {
     "key": "saved_inv_edit_click",
     "states": []
    }
   ],
   "points": [
    {
     "match": "saved_inv_edit_click",
     "label": "Edit (top bar)",
     "kind": "forward",
     "to": "edit_inv_scr",
     "source": "decision 0193: Edit is one tap in the saved invoice's top bar"
    },
    {
     "match": "tap:saved_inv_scr:InvoiceDetailsComponents.action_templates",
     "label": "Templates → preview (templates panel)",
     "kind": "forward",
     "to": "preview_invoice_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/components/InvoiceDetailsComponents.kt:170; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceScreen.kt:686; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceViewModel.kt:191; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/InvoiceDocNavigation.kt:311-322"
    },
    {
     "match": "save_inv_download_click",
     "label": "Download",
     "kind": "stay",
     "stay": "Saves the PDF, snackbar with the path",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/components/InvoiceDetailsComponents.kt:176; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceScreen.kt:687-696; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceViewModel.kt:155-162,389"
    },
    {
     "match": "saved_inv_signature_click",
     "label": "Signature (Preview khulta hai, signature sheet ke saath)",
     "kind": "forward",
     "to": "signature_create_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceViewModel.kt:224 → PreviewInvoiceViewModel.kt:225 (openSignatureSelection)"
    },
    {
     "match": "saved_inv_stamp_click",
     "label": "Stamp (Preview khulta hai, stamp sheet ke saath)",
     "kind": "forward",
     "to": "stamp_add_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceViewModel.kt:234 → PreviewInvoiceViewModel.kt:234 (openStampSelection)"
    },
    {
     "match": "saved_inv_more_click",
     "label": "More",
     "kind": "stay",
     "stay": "Opens a dropdown menu inline (Edit → edit_inv_scr, Delete, Feedback, Share link, Translate → translate_scr)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/components/ActionButtonComponents.kt:403-404; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceScreen.kt:699-703"
    },
    {
     "match": "saved_inv_back_click",
     "label": "Back arrow → Invoices list",
     "kind": "backward",
     "to": "dashboard",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceScreen.kt:464,469; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceViewModel.kt:134-148; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/InvoiceDocNavigation.kt:323-327"
    },
    {
     "match": "label:Offline",
     "label": "Render-mode toggle (debug builds only)",
     "kind": "stay",
     "stay": "Cycles Offline HTML → Native → Online HTML",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceScreen.kt:472-477"
    },
    {
     "match": "saved_inv_translate_btn_click",
     "label": "Translate this invoice",
     "kind": "forward",
     "to": "translate_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceScreen.kt:498-499,444"
    },
    {
     "match": "saved_inv_send_invoice",
     "label": "Send Invoice",
     "kind": "conditional",
     "branches": [
      {
       "when": "premium, or Remote Config saved_invoice_inter_enabled=true (gate already shown on the editor): notification-permission prompt then share",
       "outside": "Share chooser"
      },
      {
       "when": "free user and the flag is false: ad-or-premium dialog",
       "to": "ad_dialog_shown"
      }
     ],
     "returnsTo": "saved_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/components/SendButton.kt:132; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceScreen.kt:531-546,787; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceViewModel.kt:164-188"
    },
    {
     "match": "@footer_button",
     "label": "Footer button on the page (round ×, or pencil for Premium; absent when the footer is switched off)",
     "kind": "conditional",
     "branches": [
      {
       "when": "free account: the paywall opens (Remove)",
       "to": "premium_scr"
      },
      {
       "when": "Premium account: 'Edit' / 'Add footer' opens the footer sheet",
       "to": "own_footer_sheet"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterPreviewHooks.kt:74; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterPreviewHooks.kt:75; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterPreviewHooks.kt:78",
     "events": [
      "invoice_preview_footer_remove",
      "invoice_preview_footer_edit"
     ]
    },
    {
     "match": "@more_delete",
     "label": "More → Delete",
     "kind": "forward",
     "to": "delete_invoice_dialog",
     "toState": "payments-advance",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceScreen.kt:676; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceScreen.kt:699"
    },
    {
     "match": "@system_back",
     "label": "Android back → Invoices list",
     "kind": "backward",
     "to": "dashboard",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceScreen.kt:101-103; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceViewModel.kt:134-148; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/InvoiceDocNavigation.kt:323-327"
    }
   ],
   "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/InvoiceDocNavigation.kt:243"
  },
  "shipping_scr": {
   "dataScreen": "shipping_scr",
   "kind": "sheet",
   "parent": "create_inv_scr",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "nolabel@28,224,692,322",
     "states": []
    },
    {
     "key": "shipping_close",
     "states": []
    },
    {
     "key": "shipping_amount_add_success",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36",
     "events": [
      "shipping_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36",
     "events": [
      "shipping_close#swipe"
     ]
    },
    {
     "match": "nolabel@28,224,692,322",
     "label": "Shipping amount",
     "kind": "stay",
     "stay": "types the amount",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/shipping/ShippingScreen.kt"
    },
    {
     "match": "shipping_close",
     "label": "Close (X)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/shipping/ShippingScreen.kt:72"
    },
    {
     "match": "shipping_amount_add_success",
     "label": "Save (closes; shipping applied)",
     "kind": "conditional",
     "branches": [
      {
       "when": "no valid amount (button disabled)",
       "to": "shipping_scr"
      },
      {
       "when": "valid",
       "to": "create_inv_scr",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/shipping/ShippingScreen.kt:81"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:80",
     "events": [
      "shipping_close#scrim_or_back"
     ]
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:63)"
  },
  "signature_create_scr": {
   "dataScreen": "signature_create_scr",
   "kind": "sheet",
   "parent": "preview_invoice_scr",
   "pictured": true,
   "states": [
    "empty"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "tap:signature_create_scr:SignatureBottomSheetContent.selected_2",
     "states": []
    },
    {
     "key": "signature_scr_close",
     "states": []
    },
    {
     "key": "signature_added_success",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "preview_invoice_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/signature/list/SignatureListBottomSheetContent.kt:248-250",
     "events": [
      "signature_scr_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe sheet down (closes)",
     "kind": "backward",
     "to": "preview_invoice_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/signature/list/SignatureListBottomSheetContent.kt:248-250",
     "events": [
      "signature_scr_close#swipe"
     ]
    },
    {
     "match": "tap:signature_create_scr:SignatureBottomSheetContent.selected_2",
     "label": "Ink colour",
     "kind": "stay",
     "stay": "Selects ink colour",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/signature/create/SignatureBottomSheetContent.kt:466"
    },
    {
     "match": "signature_scr_close",
     "label": "Close",
     "kind": "backward",
     "to": "preview_invoice_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/signature/create/SignatureBottomSheetContent.kt:105,109; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/signature/list/SignatureListBottomSheetContent.kt:262"
    },
    {
     "match": "signature_added_success",
     "label": "Save signature (closes)",
     "kind": "backward",
     "to": "preview_invoice_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/signature/create/SignatureBottomSheetContent.kt:112-116; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/signature/list/SignatureListBottomSheetContent.kt:232-238"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes sheet)",
     "kind": "backward",
     "to": "preview_invoice_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/signature/list/SignatureListBottomSheetContent.kt:248-250",
     "events": [
      "signature_scr_close#scrim_or_back"
     ]
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/signature/list/SignatureListBottomSheetContent.kt:246-265"
  },
  "splash_scr": {
   "dataScreen": "splash_scr",
   "kind": "screen",
   "parent": null,
   "pictured": true,
   "states": [
    "loading"
   ],
   "controls": [],
   "points": [
    {
     "match": "@auto",
     "label": "Splash finishes (after the app-open ad gate) and routes",
     "kind": "conditional",
     "branches": [
      {
       "when": "a shared-invoice link is waiting (any session state)",
       "to": "received_invoice"
      },
      {
       "when": "signed out (returning user, no session), or init error",
       "to": "login_scr"
      },
      {
       "when": "session exists and the user has already created an invoice",
       "to": "dashboard"
      },
      {
       "when": "session exists (incl. new offline guest) but no invoice yet — first run",
       "to": "create_inv_scr"
      }
     ],
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/AppNavHost.kt:281-354; feature/splash/src/commonMain/kotlin/invotick/invoicemaker/feature/splash/presentation/SplashViewModel.kt:433-446"
    },
    {
     "match": "@system_back",
     "label": "Android back on splash",
     "kind": "outside",
     "outside": "Leaves the app (home screen)",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/AppNavHost.kt:274"
    }
   ],
   "source": "feature/splash/src/commonMain/kotlin/invotick/invoicemaker/feature/splash/navigation/SplashNavigation.kt:66"
  },
  "stamp_add_scr": {
   "dataScreen": "stamp_add_scr",
   "kind": "sheet",
   "parent": "preview_invoice_scr",
   "pictured": true,
   "states": [
    "empty"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "tap:preview_invoice_scr:StampBottomSheetContent.compact_stamp_option_3",
     "states": []
    },
    {
     "key": "nolabel@56,825,664,923",
     "states": []
    },
    {
     "key": "nolabel@56,931,664,1029",
     "states": []
    },
    {
     "key": "nolabel@56,1038,664,1136",
     "states": []
    },
    {
     "key": "tap:preview_invoice_scr:StampBottomSheetContent.compact_color_selection_4",
     "states": []
    },
    {
     "key": "stamp_bottom_sheet_close",
     "states": []
    },
    {
     "key": "stamp_added_success",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "preview_invoice_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/stamp/list/StampListBottomSheetContent.kt:254-256"
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe sheet down (closes)",
     "kind": "backward",
     "to": "preview_invoice_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/stamp/list/StampListBottomSheetContent.kt:254-256"
    },
    {
     "match": "tap:preview_invoice_scr:StampBottomSheetContent.compact_stamp_option_3",
     "label": "Stamp shape",
     "kind": "stay",
     "stay": "Selects stamp shape",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/stamp/create/StampBottomSheetContent.kt:560"
    },
    {
     "match": "re:^nolabel@56,(825|931|1038),664,",
     "label": "Stamp text line",
     "kind": "stay",
     "stay": "Types upper/centre/lower stamp text",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/stamp/create/StampBottomSheetContent.kt:738-760"
    },
    {
     "match": "tap:preview_invoice_scr:StampBottomSheetContent.compact_color_selection_4",
     "label": "Stamp colour",
     "kind": "stay",
     "stay": "Selects stamp colour",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/stamp/create/StampBottomSheetContent.kt:920"
    },
    {
     "match": "stamp_bottom_sheet_close",
     "label": "Close → discard confirmation",
     "kind": "forward",
     "to": "off:discard_stamp_dialog",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/stamp/create/StampBottomSheetContent.kt:135,138,177"
    },
    {
     "match": "stamp_added_success",
     "label": "Save stamp (closes)",
     "kind": "backward",
     "to": "preview_invoice_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/stamp/create/StampBottomSheetContent.kt:143-146,119-120; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/stamp/list/StampListBottomSheetContent.kt:239-242"
    },
    {
     "match": "@system_back",
     "label": "Android back → discard confirmation",
     "kind": "forward",
     "to": "off:discard_stamp_dialog",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/stamp/create/StampBottomSheetContent.kt:111-113"
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/stamp/list/StampListBottomSheetContent.kt:252-270"
  },
  "tax_scr": {
   "dataScreen": "tax_scr",
   "kind": "sheet",
   "parent": "create_inv_scr",
   "pictured": true,
   "states": [
    "add-dialog",
    "list"
   ],
   "controls": [
    {
     "key": "tap:tax_scr:AddTaxDialog.close_1",
     "states": [
      "add-dialog"
     ]
    },
    {
     "key": "nolabel@71,286,649,384",
     "states": [
      "add-dialog"
     ]
    },
    {
     "key": "label:%",
     "states": [
      "add-dialog"
     ]
    },
    {
     "key": "label:Add a description",
     "states": [
      "add-dialog"
     ]
    },
    {
     "key": "tap:tax_scr:AddTaxDialog.cancel_2",
     "states": [
      "add-dialog"
     ]
    },
    {
     "key": "tap:tax_scr:AddTaxDialog.add_tax_dialog_3",
     "states": [
      "add-dialog"
     ]
    },
    {
     "key": "label:Close sheet",
     "states": [
      "list"
     ]
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": [
      "list"
     ]
    },
    {
     "key": "label:Search · Search taxes...",
     "states": [
      "list"
     ]
    },
    {
     "key": "tax_added_success",
     "states": [
      "list"
     ]
    },
    {
     "key": "tap:tax_scr:TaxScreen.more_options_5",
     "states": [
      "list"
     ]
    },
    {
     "key": "tax_scr_close",
     "states": [
      "list"
     ]
    },
    {
     "key": "tap:tax_scr:TaxScreen.enter_selection_mode_3",
     "states": [
      "list"
     ]
    },
    {
     "key": "tap:tax_scr:Create Tax",
     "states": [
      "list"
     ]
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:62)",
     "events": [
      "tax_scr_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:62)",
     "events": [
      "tax_scr_close#swipe"
     ]
    },
    {
     "match": "label:Search · Search taxes...",
     "label": "Search",
     "kind": "stay",
     "stay": "types a search filter"
    },
    {
     "match": "tax_added_success",
     "label": "Pick a tax (closes; set on invoice)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/tax/TaxScreen.kt:251"
    },
    {
     "match": "tap:tax_scr:TaxScreen.more_options_5",
     "label": "More options (row)",
     "kind": "stay",
     "stay": "opens Edit/Delete menu inline (edit/confirm dialogs stay in this sheet)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/tax/TaxScreen.kt:509"
    },
    {
     "match": "tax_scr_close",
     "label": "Close (X)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/tax/TaxScreen.kt:137"
    },
    {
     "match": "tap:tax_scr:TaxScreen.enter_selection_mode_3",
     "label": "Selection mode",
     "kind": "stay",
     "stay": "turns on multi-select for deleting",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/tax/TaxScreen.kt:184"
    },
    {
     "match": "tap:tax_scr:Create Tax",
     "label": "Create button",
     "kind": "stay",
     "stay": "opens the Add Tax dialog inside this sheet (add-dialog state)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/tax/TaxScreen.kt:231"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:80",
     "events": [
      "tax_scr_close#scrim_or_back"
     ]
    },
    {
     "match": "tap:tax_scr:AddTaxDialog.close_1",
     "label": "Add Tax dialog: close (X)",
     "kind": "stay",
     "stay": "closes the dialog, back to the tax list",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/tax/components/AddTaxDialog.kt:149"
    },
    {
     "match": "re:^(nolabel@71,286,649,384|label:%|label:Add\\ a\\ description)$",
     "label": "Add Tax dialog fields (type)",
     "kind": "stay",
     "stay": "types text",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/tax/components/AddTaxDialog.kt"
    },
    {
     "match": "tap:tax_scr:AddTaxDialog.cancel_2",
     "label": "Add Tax dialog: Cancel",
     "kind": "stay",
     "stay": "closes the dialog, back to the tax list",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/tax/components/AddTaxDialog.kt:292"
    },
    {
     "match": "tap:tax_scr:AddTaxDialog.add_tax_dialog_3",
     "label": "Add Tax dialog: Save (new tax applied; sheet closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/tax/TaxViewModel.kt:324"
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:62)"
  },
  "terms_and_condintion_scr": {
   "dataScreen": "terms_and_condintion_scr",
   "kind": "sheet",
   "parent": "create_inv_scr",
   "pictured": true,
   "states": [
    "list"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "label:Search · Search terms...",
     "states": []
    },
    {
     "key": "tap:terms_and_condintion_scr:TermsListScreen.terms_item_4",
     "states": []
    },
    {
     "key": "tap:terms_and_condintion_scr:TermsListScreen.more_options_for_terms_5",
     "states": []
    },
    {
     "key": "terms_list_screen_close",
     "states": []
    },
    {
     "key": "tap:terms_and_condintion_scr:TermsListScreen.enter_selection_mode_3",
     "states": []
    },
    {
     "key": "tap:terms_and_condintion_scr:Create Terms",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:64)",
     "events": [
      "terms_list_screen_close#scrim_or_back"
     ]
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe the sheet down (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:64)",
     "events": [
      "terms_list_screen_close#swipe"
     ]
    },
    {
     "match": "label:Search · Search terms...",
     "label": "Search",
     "kind": "stay",
     "stay": "types a search filter"
    },
    {
     "match": "tap:terms_and_condintion_scr:TermsListScreen.terms_item_4",
     "label": "Pick terms (closes; set on invoice)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/terms/TermsListScreen.kt:237"
    },
    {
     "match": "tap:terms_and_condintion_scr:TermsListScreen.more_options_for_terms_5",
     "label": "More options (row)",
     "kind": "stay",
     "stay": "opens Edit/Delete menu inline (edit/confirm dialogs stay in this sheet)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/terms/TermsListScreen.kt:531"
    },
    {
     "match": "terms_list_screen_close",
     "label": "Close (X)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/terms/TermsListScreen.kt:131"
    },
    {
     "match": "tap:terms_and_condintion_scr:TermsListScreen.enter_selection_mode_3",
     "label": "Selection mode",
     "kind": "stay",
     "stay": "turns on multi-select for deleting",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/terms/TermsListScreen.kt:176"
    },
    {
     "match": "tap:terms_and_condintion_scr:Create Terms",
     "label": "Create button",
     "kind": "stay",
     "stay": "opens the Add Terms dialog inside this sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/terms/TermsListScreen.kt:220"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/BottomSheet.kt:80",
     "events": [
      "terms_list_screen_close#scrim_or_back"
     ]
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetContainer.kt:36 (feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/BottomSheetType.kt:64)"
  },
  "tools_scr": {
   "dataScreen": "tools_scr",
   "kind": "screen",
   "parent": "dashboard",
   "pictured": true,
   "states": [
    "default"
   ],
   "controls": [
    {
     "key": "tools_received_invoices_click",
     "states": []
    },
    {
     "key": "tools_expenses_click",
     "states": []
    },
    {
     "key": "tools_payment_form_click",
     "states": []
    },
    {
     "key": "label:Invoice",
     "states": []
    },
    {
     "key": "label:Estimate",
     "states": []
    },
    {
     "key": "label:Analytics",
     "states": []
    },
    {
     "key": "label:Ledgers",
     "states": []
    },
    {
     "key": "label:Tools",
     "states": []
    }
   ],
   "points": [
    {
     "match": "tools_received_invoices_click",
     "label": "Received Invoices",
     "kind": "conditional",
     "branches": [
      {
       "when": "count > 0",
       "to": "received_invoice_list"
      },
      {
       "when": "none received: snackbar 'You haven't received any invoices yet'",
       "to": "tools_scr"
      }
     ],
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/ToolsColors.kt:153-166; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:754-756"
    },
    {
     "match": "tools_expenses_click",
     "label": "Expenses",
     "kind": "forward",
     "to": "expense_list",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/ToolsColors.kt:174-175; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:760-762"
    },
    {
     "match": "tools_payment_form_click",
     "label": "Payment Form",
     "kind": "forward",
     "to": "customer_list",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/ToolsColors.kt:182-183; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:763-765"
    },
    {
     "match": "label:Invoice",
     "label": "Invoice tab",
     "kind": "forward",
     "to": "dashboard",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:978 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "label:Estimate",
     "label": "Estimate tab",
     "kind": "forward",
     "to": "estimate_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:993 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "label:Analytics",
     "label": "Analytics tab",
     "kind": "forward",
     "to": "analytics_dashboard_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:970 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "label:Ledgers",
     "label": "Ledgers tab",
     "kind": "forward",
     "to": "client_ledger_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:1001 (core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/bottomNavigationBar/BottomNavItem.kt:108)"
    },
    {
     "match": "label:Tools",
     "label": "Tools tab (already here)",
     "kind": "stay",
     "stay": "Current tab: handleBottomNavigation returns without navigating",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:969"
    },
    {
     "match": "@system_back",
     "label": "Android back",
     "kind": "conditional",
     "branches": [
      {
       "when": "normal case",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "app was opened straight into a new invoice (first run) and the Invoices list is not underneath",
       "to": "create_inv_scr",
       "back": true
      }
     ],
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/ToolsColors.kt:89-91; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:757-759"
    }
   ],
   "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:733-772"
  },
  "translate_scr": {
   "dataScreen": "translate_scr",
   "kind": "sheet",
   "parent": "saved_inv_scr",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "tap:saved_inv_scr:TranslateSheet.language_option",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "saved_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/components/TranslateSheet.kt:55; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceScreen.kt:457"
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe sheet down (closes)",
     "kind": "backward",
     "to": "saved_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/components/TranslateSheet.kt:55; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceScreen.kt:457"
    },
    {
     "match": "tap:saved_inv_scr:TranslateSheet.language_option",
     "label": "Pick language (closes)",
     "kind": "backward",
     "to": "saved_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/components/TranslateSheet.kt:80; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceScreen.kt:446-456"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes sheet)",
     "kind": "backward",
     "to": "saved_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceScreen.kt:457"
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/components/TranslateSheet.kt:53; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceScreen.kt:444-458"
  },
  "off:invoice_details_sheet": {
   "label": "Invoice details sheet (number, issue/due date, reminder)",
   "dataScreen": null,
   "kind": "screen",
   "parent": "create_inv_scr",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@save",
     "label": "Save Changes (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:2511"
    },
    {
     "match": "@cancel",
     "label": "Cancel (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:2520"
    },
    {
     "match": "@scrim",
     "label": "Tap outside (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:2424"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:549"
    }
   ]
  },
  "off:invoice_preview_sheet": {
   "label": "Inline invoice preview sheet (Create/Edit Invoice)",
   "dataScreen": null,
   "kind": "screen",
   "parent": "create_inv_scr",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@close",
     "label": "Drag handle / tap outside / pull the page down (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:841"
    },
    {
     "match": "@footer_button",
     "label": "Footer button on the page (round ×, or pencil for Premium; absent when the footer is switched off)",
     "kind": "conditional",
     "branches": [
      {
       "when": "free account: the paywall opens (Remove)",
       "to": "premium_scr"
      },
      {
       "when": "Premium account: 'Edit' / 'Add footer' opens the footer sheet",
       "to": "own_footer_sheet"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterPreviewHooks.kt:74; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterPreviewHooks.kt:75; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterPreviewHooks.kt:78",
     "events": [
      "invoice_preview_footer_remove",
      "invoice_preview_footer_edit"
     ]
    },
    {
     "match": "@system_back",
     "label": "Android back (closes)",
     "kind": "backward",
     "to": "create_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:841"
    }
   ]
  },
  "off:business_form_logo_list_sheet": {
   "label": "Logo designs sheet (business form)",
   "dataScreen": "business_form_logo_list_sheet",
   "kind": "screen",
   "parent": "create_business",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@tile",
     "label": "Logo design tile (closes; logo applied)",
     "kind": "backward",
     "to": "create_business",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:368"
    },
    {
     "match": "@close",
     "label": "Back arrow / tap outside / back (closes)",
     "kind": "backward",
     "to": "create_business",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:350"
    }
   ]
  },
  "off:business_form_business_category_sheet": {
   "label": "Business category sheet (business form)",
   "dataScreen": "business_form_business_category_sheet",
   "kind": "screen",
   "parent": "edit_business",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@category",
     "label": "Pick a category (closes)",
     "kind": "backward",
     "to": "edit_business",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:409"
    },
    {
     "match": "@close",
     "label": "Back arrow / tap outside / back (closes)",
     "kind": "backward",
     "to": "edit_business",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessForm/BusinessFormScreen.kt:388"
    }
   ]
  },
  "off:in_app_camera": {
   "label": "In-app camera (full screen)",
   "dataScreen": null,
   "kind": "screen",
   "parent": "create_business_choose_logo_sheet",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@capture",
     "label": "Take photo",
     "kind": "forward",
     "to": "off:image_cropper",
     "source": "core/camera/src/androidMain/kotlin/invotick/invoicemaker/core/camera/ImageSource.android.kt:104"
    },
    {
     "match": "@cancel",
     "label": "Cancel / back",
     "kind": "conditional",
     "branches": [
      {
       "when": "invoice flow",
       "to": "create_business_choose_logo_sheet",
       "back": true
      },
      {
       "when": "Add/Edit Business screen",
       "to": "business_form_choose_logo_sheet",
       "back": true
      }
     ],
     "source": "core/camera/src/androidMain/kotlin/invotick/invoicemaker/core/camera/ImageSource.android.kt:105"
    }
   ]
  },
  "off:image_cropper": {
   "label": "Image cropper (full screen)",
   "dataScreen": null,
   "kind": "screen",
   "parent": "create_business_choose_logo_sheet",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@done",
     "label": "Crop done (logo applied; logo sheet closes)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from the invoice flow's logo sheet",
       "to": "business_add_form_landed",
       "back": true
      },
      {
       "when": "opened from Add Business",
       "to": "create_business",
       "back": true
      },
      {
       "when": "opened from Edit Business",
       "to": "edit_business",
       "back": true
      }
     ],
     "source": "core/camera/src/androidMain/kotlin/invotick/invoicemaker/core/camera/ImageSource.android.kt:114"
    },
    {
     "match": "@cancel",
     "label": "Cancel / back",
     "kind": "conditional",
     "branches": [
      {
       "when": "invoice flow",
       "to": "create_business_choose_logo_sheet",
       "back": true
      },
      {
       "when": "Add/Edit Business screen",
       "to": "business_form_choose_logo_sheet",
       "back": true
      }
     ],
     "source": "core/camera/src/androidMain/kotlin/invotick/invoicemaker/core/camera/ImageSource.android.kt:122"
    }
   ]
  },
  "off:invoice_item_discount_sheet": {
   "label": "Line discount sheet (edit invoice item)",
   "dataScreen": "invoice_item_discount_sheet",
   "kind": "screen",
   "parent": "invoice_item_form",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@save",
     "label": "Save (closes; discount applied)",
     "kind": "backward",
     "to": "invoice_item_form",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/invoiceItem/InvoiceItemScreen.kt:205"
    },
    {
     "match": "@close",
     "label": "Close / tap outside / back",
     "kind": "backward",
     "to": "invoice_item_form",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/invoiceItem/InvoiceItemScreen.kt:205"
    }
   ]
  },
  "off:invoice_item_tax_sheet": {
   "label": "Line tax sheet (edit invoice item)",
   "dataScreen": "invoice_item_tax_sheet",
   "kind": "screen",
   "parent": "invoice_item_form",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@pick",
     "label": "Pick a tax (closes)",
     "kind": "backward",
     "to": "invoice_item_form",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/invoiceItem/InvoiceItemScreen.kt:237"
    },
    {
     "match": "@close",
     "label": "Close / tap outside / back",
     "kind": "backward",
     "to": "invoice_item_form",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/bottomSheet/invoiceItem/InvoiceItemScreen.kt:237"
    }
   ]
  },
  "off:estimate_list_business_sheet": {
   "label": "Estimates business sheet",
   "dataScreen": "estimate_list_business_sheet",
   "kind": "screen",
   "parent": "estimate_scr",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@close",
     "label": "Close / pick business",
     "kind": "backward",
     "to": "estimate_scr",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/list/EstimateListScreen.kt:212-230"
    }
   ]
  },
  "off:estimate_edit_scr": {
   "label": "Edit estimate",
   "dataScreen": "estimate_edit_scr",
   "kind": "screen",
   "parent": "estimate_scr",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@back",
     "label": "Back",
     "kind": "backward",
     "to": "estimate_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/EstimateDocNavigation.kt:163-170"
    }
   ]
  },
  "off:save_estimate_scr": {
   "label": "Saved estimate",
   "dataScreen": "save_estimate_scr",
   "kind": "screen",
   "parent": "estimate_scr",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@back",
     "label": "Back",
     "kind": "backward",
     "to": "estimate_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/EstimateDocNavigation.kt:64-65"
    }
   ]
  },
  "off:estimate_details_sheet": {
   "label": "Estimate number / dates sheet",
   "dataScreen": null,
   "kind": "screen",
   "parent": "create_estimate",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@close",
     "label": "Save / dismiss (closes)",
     "kind": "backward",
     "to": "create_estimate",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/document/estimate/EstimateScreen.kt:740-756"
    },
    {
     "match": "@currency",
     "label": "Currency",
     "kind": "forward",
     "to": "invoice_currency",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/document/estimate/EstimateScreen.kt:757-763"
    }
   ]
  },
  "off:estimate_preview_sheet": {
   "label": "Estimate inline preview sheet",
   "dataScreen": null,
   "kind": "screen",
   "parent": "create_estimate",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@close",
     "label": "Swipe / pull down (closes)",
     "kind": "backward",
     "to": "create_estimate",
     "source": "feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/document/estimate/EstimateScreen.kt:646,724-733"
    }
   ]
  },
  "off:create_client": {
   "label": "New client (full screen)",
   "dataScreen": "create_client",
   "kind": "screen",
   "parent": "client_ledger_scr",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@back",
     "label": "Back / saved",
     "kind": "backward",
     "to": "client_ledger_scr",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/navigation/CustomerNavigation.kt:109-115"
    }
   ]
  },
  "off:edit_client": {
   "label": "Edit client",
   "dataScreen": "edit_client",
   "kind": "screen",
   "parent": "client_details",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@back",
     "label": "Back / saved",
     "kind": "backward",
     "to": "client_details",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/navigation/CustomerNavigation.kt:118-127"
    }
   ]
  },
  "off:client_list_business_sheet": {
   "label": "Ledger business sheet",
   "dataScreen": "client_list_business_sheet",
   "kind": "screen",
   "parent": "client_ledger_scr",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@close",
     "label": "Close / pick business",
     "kind": "backward",
     "to": "client_ledger_scr",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/list/ClientListScreen.kt:104-136"
    }
   ]
  },
  "off:currency_picker": {
   "label": "Currency picker dialog",
   "dataScreen": null,
   "kind": "screen",
   "parent": "client_ledger_scr",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@close",
     "label": "Pick / dismiss",
     "kind": "backward",
     "to": "client_ledger_scr",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/list/ClientListScreen.kt:300-314; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:119-126"
    }
   ]
  },
  "off:customer_details_customer_sheet": {
   "label": "Change customer sheet",
   "dataScreen": "customer_details_customer_sheet",
   "kind": "screen",
   "parent": "client_details",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@close",
     "label": "Close / pick customer",
     "kind": "backward",
     "to": "client_details",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/presentation/details/CustomerDetailsScreen.kt:97-104"
    }
   ]
  },
  "off:client_ledger_detail": {
   "label": "Customer ledger statement",
   "dataScreen": "client_ledger_detail",
   "kind": "screen",
   "parent": "client_details",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@back",
     "label": "Back",
     "kind": "backward",
     "to": "client_details",
     "source": "feature/customer/src/commonMain/kotlin/invotick/invoicemaker/feature/customer/navigation/CustomerNavigation.kt:131-139"
    }
   ]
  },
  "off:payment_form_list": {
   "label": "Client payment forms",
   "dataScreen": "payment_form_list",
   "kind": "screen",
   "parent": "customer_list",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@create",
     "label": "New payment (Add payment)",
     "kind": "forward",
     "to": "payment_form_scr",
     "source": "feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/navigation/PaymentFormNavigation.kt:69; feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/navigation/PaymentFormNavigation.kt:70"
    },
    {
     "match": "@back",
     "label": "Back (navigates to the Payment Form graph start)",
     "kind": "backward",
     "to": "customer_list",
     "source": "feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/navigation/PaymentFormNavigation.kt:71-77"
    }
   ]
  },
  "off:edit_expense": {
   "label": "Edit expense",
   "dataScreen": "edit_expense",
   "kind": "screen",
   "parent": "expense_list",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@back",
     "label": "Back / saved",
     "kind": "backward",
     "to": "expense_list",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/navigation/ExpenseNavigation.kt:87-96"
    }
   ]
  },
  "off:expense_list_business_select": {
   "label": "Expenses business sheet",
   "dataScreen": "expense_list_business_select",
   "kind": "screen",
   "parent": "expense_list",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@close",
     "label": "Close / pick business",
     "kind": "backward",
     "to": "expense_list",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/expenseList/ExpenseListScreen.kt:467-476"
    }
   ]
  },
  "off:already_have_premium_dialog": {
   "label": "Already have Premium? dialog",
   "dataScreen": null,
   "kind": "screen",
   "parent": "premium_scr",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@restore",
     "label": "I bought it on this device (restore)",
     "kind": "backward",
     "to": "premium_scr",
     "source": "feature/premium/src/commonMain/kotlin/invotick/invoicemaker/feature/premium/presentation/PremiumPaywallSheet.kt:857"
    },
    {
     "match": "@other_device",
     "label": "On another device",
     "kind": "forward",
     "to": "off:linked_devices",
     "source": "feature/premium/src/commonMain/kotlin/invotick/invoicemaker/feature/premium/presentation/PremiumPaywallSheet.kt:862,114; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:900-903"
    },
    {
     "match": "@dismiss",
     "label": "Dismiss",
     "kind": "backward",
     "to": "premium_scr",
     "source": "feature/premium/src/commonMain/kotlin/invotick/invoicemaker/feature/premium/presentation/PremiumPaywallSheet.kt:840"
    }
   ]
  },
  "off:linked_devices": {
   "label": "Link a device",
   "dataScreen": "linked_devices",
   "kind": "screen",
   "parent": "dashboard",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@back",
     "label": "Back",
     "kind": "backward",
     "to": "dashboard",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:774-781"
    }
   ]
  },
  "off:save_template_dialog": {
   "label": "Save custom template dialog",
   "dataScreen": null,
   "kind": "screen",
   "parent": "preview_invoice_scr",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@yes",
     "label": "Yes, save template / No, continue without saving",
     "kind": "forward",
     "to": "saved_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/PreviewInvoiceScreen.kt:536-545; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/PreviewInvoiceViewModel.kt:183-202"
    },
    {
     "match": "@close",
     "label": "Close",
     "kind": "backward",
     "to": "preview_invoice_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/PreviewInvoiceScreen.kt:536-545"
    }
   ]
  },
  "off:discard_stamp_dialog": {
   "label": "Discard stamp? dialog",
   "dataScreen": null,
   "kind": "screen",
   "parent": "stamp_add_scr",
   "pictured": false,
   "states": [],
   "controls": [],
   "points": [
    {
     "match": "@discard",
     "label": "Discard",
     "kind": "backward",
     "to": "preview_invoice_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/stamp/create/StampBottomSheetContent.kt:223-227"
    },
    {
     "match": "@keep",
     "label": "Keep editing / dismiss",
     "kind": "backward",
     "to": "stamp_add_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/stamp/create/StampBottomSheetContent.kt:181,240-241"
    }
   ]
  },
  "drawer": {
   "label": "Navigation drawer (menu)",
   "dataScreen": null,
   "kind": "screen",
   "parent": "dashboard",
   "pictured": true,
   "states": [
    "guest",
    "signed-in"
   ],
   "controls": [
    {
     "key": "sb_login_click",
     "states": [
      "guest"
     ]
    },
    {
     "key": "tap:dashboard:DrawerHeaderSection.guest_mode_card_4",
     "states": [
      "guest"
     ]
    },
    {
     "key": "tap:dashboard:DrawerHeaderSection.business_info_card_6",
     "states": []
    },
    {
     "key": "tap:dashboard:DrawerHeaderSection.close_drawer_1",
     "states": []
    },
    {
     "key": "tap:dashboard:NavigationDrawerContent.go_premium_1",
     "states": []
    },
    {
     "key": "tap:dashboard:DrawerTiles.drawer_item_dashboard",
     "states": []
    },
    {
     "key": "tap:dashboard:DrawerTiles.drawer_create_invoice_item_2",
     "states": []
    },
    {
     "key": "tap:dashboard:DrawerTiles.drawer_item_create_client",
     "states": []
    },
    {
     "key": "tap:dashboard:DrawerTiles.drawer_item_business",
     "states": []
    },
    {
     "key": "label:Invoice",
     "states": []
    },
    {
     "key": "label:Estimate",
     "states": []
    },
    {
     "key": "label:Analytics",
     "states": []
    },
    {
     "key": "label:Ledgers",
     "states": []
    },
    {
     "key": "label:Tools",
     "states": []
    },
    {
     "key": "tap:dashboard:DrawerHeaderSection.drawer_header_section_2",
     "states": [
      "signed-in"
     ]
    },
    {
     "key": "tap:dashboard:DrawerHeaderSection.invotick_id_chip_5",
     "states": [
      "signed-in"
     ]
    },
    {
     "key": "tap:dashboard:DrawerTiles.drawer_item_appearance",
     "states": [
      "signed-in"
     ]
    }
   ],
   "points": [
    {
     "match": "sb_login_click",
     "label": "Sign In (guest)",
     "kind": "forward",
     "to": "login_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerHeaderSection.kt:285; composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/NavigationDrawerScreen.kt:72; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/AppNavHost.kt:444"
    },
    {
     "match": "tap:dashboard:DrawerHeaderSection.guest_mode_card_4",
     "label": "Create Account (guest)",
     "kind": "forward",
     "to": "register_acc_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerHeaderSection.kt:300; composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/NavigationDrawerScreen.kt:78; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/AppNavHost.kt:450"
    },
    {
     "match": "tap:dashboard:DrawerHeaderSection.drawer_header_section_2",
     "label": "Account card (name, email)",
     "kind": "stay",
     "stay": "Does nothing: it sends NavigateToProfile, and the shell's handler for that is empty (onNavigateToProfile = {})",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerHeaderSection.kt:146; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:480"
    },
    {
     "match": "tap:dashboard:DrawerHeaderSection.invotick_id_chip_5",
     "label": "Invotick ID chip",
     "kind": "stay",
     "stay": "Copies the Invotick ID to the clipboard",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerHeaderSection.kt:350"
    },
    {
     "match": "tap:dashboard:DrawerHeaderSection.business_info_card_6",
     "label": "Business card",
     "kind": "conditional",
     "branches": [
      {
       "when": "no business set yet (drawer closes)",
       "to": "create_business"
      },
      {
       "when": "a business is set: opens the business switcher menu in place (pick one, or Add business)"
      }
     ],
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerHeaderSection.kt:446,448; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:483"
    },
    {
     "match": "tap:dashboard:DrawerHeaderSection.close_drawer_1",
     "label": "Close drawer (X)",
     "kind": "conditional",
     "branches": [
      {
       "when": "drawer was opened on the Invoices list",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "drawer was opened on the Estimates list",
       "to": "estimate_scr",
       "back": true
      }
     ],
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerHeaderSection.kt:121; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:370"
    },
    {
     "match": "tap:dashboard:NavigationDrawerContent.go_premium_1",
     "label": "Go Premium",
     "kind": "forward",
     "to": "premium_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/NavigationDrawerContent.kt:66,67; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:499"
    },
    {
     "match": "tap:dashboard:DrawerTiles.drawer_item_dashboard",
     "label": "Dashboard (reports)",
     "kind": "forward",
     "to": "analytics_dashboard_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerMenuSection.kt:166; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:1066"
    },
    {
     "match": "tap:dashboard:DrawerTiles.drawer_create_invoice_item_2",
     "label": "Create Invoice",
     "kind": "forward",
     "to": "create_inv_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerMenuSection.kt:175; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:1070"
    },
    {
     "match": "tap:dashboard:DrawerTiles.drawer_item_create_client",
     "label": "Create Client",
     "kind": "forward",
     "to": "off:create_client",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerMenuSection.kt:188; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:1074"
    },
    {
     "match": "tap:dashboard:DrawerTiles.drawer_item_business",
     "label": "Manage Business",
     "kind": "forward",
     "to": "business_list",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerMenuSection.kt:218; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:1079"
    },
    {
     "match": "tap:dashboard:DrawerTiles.drawer_item_appearance",
     "label": "Appearance",
     "kind": "forward",
     "to": "appearance_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerMenuSection.kt:310; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:1097"
    },
    {
     "match": "re:^label:(Invoice|Estimate|Analytics|Ledgers|Tools)$",
     "label": "Bottom bar tabs (drawn under the drawer)",
     "kind": "stay",
     "stay": "Not tappable in the app: the drawer is a full-width panel that covers the bottom bar. The picture draws the bar under it",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:505; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:557"
    },
    {
     "match": "@accounts",
     "label": "Accounts on this phone (row under the account card; absent while Remote Config switches it off)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opens a sheet listing the accounts; picking another account opens that account's own place",
       "to": "dashboard"
      },
      {
       "when": "'Add another account' in that sheet: a new empty place opens",
       "to": "add_account_scr"
      }
     ],
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/accounts/AccountsOnThisPhone.kt:212,250,249; composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerHeaderSection.kt:192",
     "events": [
      "tap:dashboard:AccountsOnThisPhone.open_accounts_1"
     ]
    },
    {
     "match": "@language",
     "label": "Language",
     "kind": "stay",
     "stay": "Opens the app-language picker in place; choosing one switches the app's language",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerMenuSection.kt:353; composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerMenuSection.kt:357"
    },
    {
     "match": "@feedback",
     "label": "Feedback",
     "kind": "forward",
     "to": "feedback_dialog",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerMenuSection.kt:374; composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/NavigationDrawerScreen.kt:125"
    },
    {
     "match": "@rate_us",
     "label": "Rate Us (Android only)",
     "kind": "forward",
     "to": "feedback_dialog",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerMenuSection.kt:391; composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/NavigationDrawerViewModel.kt:163"
    },
    {
     "match": "@share_app",
     "label": "Share app",
     "kind": "outside",
     "outside": "Share chooser (shares the app's store link)",
     "returnsTo": "drawer",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerMenuSection.kt:404"
    },
    {
     "match": "@legal",
     "label": "Privacy Policy / Terms & Conditions",
     "kind": "stay",
     "stay": "Opens the page in a web view over the drawer",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerMenuSection.kt:425; composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/NavigationDrawerScreen.kt:117"
    },
    {
     "match": "@linked_devices",
     "label": "Linked devices",
     "kind": "forward",
     "to": "off:linked_devices",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerMenuSection.kt:505; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:1092"
    },
    {
     "match": "@sign_in",
     "label": "Sign in (guest, Account section)",
     "kind": "forward",
     "to": "login_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerMenuSection.kt:516; composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/NavigationDrawerScreen.kt:72"
    },
    {
     "match": "@sign_out",
     "label": "Sign out (a guest holding a purchase is warned first)",
     "kind": "forward",
     "to": "login_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerMenuSection.kt:535; composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/NavigationDrawerScreen.kt:56,74; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/AppNavHost.kt:453"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the drawer)",
     "kind": "conditional",
     "branches": [
      {
       "when": "drawer was opened on the Invoices list",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "drawer was opened on the Estimates list",
       "to": "estimate_scr",
       "back": true
      }
     ],
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/ShellBack.kt:41"
    }
   ],
   "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/NavigationDrawerContent.kt:38; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:452"
  },
  "exit_scr": {
   "label": "Exit app dialog",
   "dataScreen": null,
   "kind": "dialog",
   "parent": "dashboard",
   "pictured": true,
   "states": [
    "default"
   ],
   "controls": [
    {
     "key": "tap:exit_scr:ExitScreen.sign_in_from_exit",
     "states": []
    },
    {
     "key": "tap:exit_scr:ExitScreen.share_feedback_exit_2",
     "states": []
    },
    {
     "key": "app_exit_confirmed",
     "states": []
    },
    {
     "key": "app_exit_cancelled",
     "states": []
    }
   ],
   "points": [
    {
     "match": "tap:exit_scr:ExitScreen.sign_in_from_exit",
     "label": "Sign in (guests only)",
     "kind": "forward",
     "to": "login_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/exit/ExitScreen.kt:166; composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/exit/ExitScreen.kt:80; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:617"
    },
    {
     "match": "tap:exit_scr:ExitScreen.share_feedback_exit_2",
     "label": "Share feedback",
     "kind": "forward",
     "to": "feedback_dialog",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/exit/ExitScreen.kt:174; composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/exit/ExitScreen.kt:128"
    },
    {
     "match": "app_exit_confirmed",
     "label": "Exit",
     "kind": "outside",
     "outside": "Leaves the app (home screen)",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/exit/ExitScreen.kt:190; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:865,868"
    },
    {
     "match": "app_exit_cancelled",
     "label": "Stay",
     "kind": "backward",
     "to": "dashboard",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/exit/ExitScreen.kt:183; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:874,875"
    },
    {
     "match": "@system_back",
     "label": "Android back / tap outside (closes the dialog)",
     "kind": "backward",
     "to": "dashboard",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/exit/ExitScreen.kt:66; composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/exit/ExitScreen.kt:146"
    }
   ],
   "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/exit/ExitScreen.kt:145; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:837"
  },
  "feedback_dialog": {
   "label": "Feedback dialog (Contact Support / Rate us)",
   "dataScreen": null,
   "kind": "dialog",
   "parent": "dashboard",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close",
     "states": []
    },
    {
     "key": "tap:saved_inv_scr:components_FeedbackDialog_2.star_2",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close",
     "label": "Close (X)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from the drawer's Feedback or Rate Us",
       "to": "drawer",
       "back": true
      },
      {
       "when": "opened from Contact Support on the Invoices list",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "opened from the saved invoice (More → Feedback)",
       "to": "saved_inv_scr",
       "back": true
      },
      {
       "when": "opened from the exit dialog's 'Share feedback'",
       "to": "exit_scr",
       "back": true
      }
     ],
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/FeedbackDialog.kt:178; composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/exit/ExitScreen.kt:133; composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/NavigationDrawerScreen.kt:131"
    },
    {
     "match": "re:^tap:saved_inv_scr:components_FeedbackDialog_2\\.star_2$",
     "label": "Star (1 to 5)",
     "kind": "stay",
     "stay": "Picks the rating. 5 stars: 'Rate on Google Play' (opens our store page); fewer: topics and a note to send",
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/FeedbackDialog.kt:235; core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/FeedbackDialog.kt:138"
    },
    {
     "match": "@system_back",
     "label": "Android back / tap outside (closes the dialog)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from the drawer's Feedback or Rate Us",
       "to": "drawer",
       "back": true
      },
      {
       "when": "opened from Contact Support on the Invoices list",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "opened from the saved invoice (More → Feedback)",
       "to": "saved_inv_scr",
       "back": true
      },
      {
       "when": "opened from the exit dialog's 'Share feedback'",
       "to": "exit_scr",
       "back": true
      }
     ],
     "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/FeedbackDialog.kt:192"
    }
   ],
   "source": "core/ui/src/commonMain/kotlin/invotick/invoicemaker/core/ui/components/FeedbackDialog.kt:119; composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/exit/ExitScreen.kt:129; composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/NavigationDrawerScreen.kt:125; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceScreen.kt:723"
  },
  "discard_changes_dialog": {
   "label": "Discard changes dialog",
   "dataScreen": null,
   "kind": "dialog",
   "parent": "create_inv_scr",
   "pictured": true,
   "states": [
    "payments"
   ],
   "controls": [
    {
     "key": "discard_dialog_closed",
     "states": []
    },
    {
     "key": "tap:create_inv_scr:components_DiscardChangesDialog.discard_changes_dialog_2",
     "states": []
    },
    {
     "key": "discard_confirmed",
     "states": []
    },
    {
     "key": "discard_cancelled",
     "states": []
    }
   ],
   "points": [
    {
     "match": "discard_dialog_closed",
     "label": "Close (X)",
     "kind": "conditional",
     "branches": [
      {
       "when": "over Create Invoice: back to editing",
       "to": "create_inv_scr",
       "back": true
      },
      {
       "when": "over Create Estimate: back to editing",
       "to": "create_estimate",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/components/DiscardChangesDialog.kt:196"
    },
    {
     "match": "tap:create_inv_scr:components_DiscardChangesDialog.discard_changes_dialog_2",
     "label": "Save as Draft",
     "kind": "conditional",
     "branches": [
      {
       "when": "Create Invoice: the draft is saved and the screen pops back to where Create was opened (usually the invoice list)",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "Create Estimate: the draft is saved and the screen pops back to the estimate list",
       "to": "estimate_scr",
       "back": true
      },
      {
       "when": "the draft cannot be written: stays on the dialog's screen with an error",
       "to": "create_inv_scr"
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/components/DiscardChangesDialog.kt:103; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:617",
     "events": [
      "Draft_click"
     ]
    },
    {
     "match": "discard_confirmed",
     "label": "Discard Everything",
     "kind": "conditional",
     "branches": [
      {
       "when": "over Create Invoice: leaves, the work is gone",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "over Create Estimate: leaves, the work is gone",
       "to": "estimate_scr",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/components/DiscardChangesDialog.kt:339"
    },
    {
     "match": "discard_cancelled",
     "label": "Keep Editing",
     "kind": "conditional",
     "branches": [
      {
       "when": "over Create Invoice: back to editing",
       "to": "create_inv_scr",
       "back": true
      },
      {
       "when": "over Create Estimate: back to editing",
       "to": "create_estimate",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/components/DiscardChangesDialog.kt:373"
    },
    {
     "match": "@system_back",
     "label": "Android back / tap outside (closes the dialog)",
     "kind": "conditional",
     "branches": [
      {
       "when": "over Create Invoice: back to editing",
       "to": "create_inv_scr",
       "back": true
      },
      {
       "when": "over Create Estimate: back to editing",
       "to": "create_estimate",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/components/DiscardChangesDialog.kt:126"
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/create/components/DiscardChangesDialog.kt:79; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/document/invoice/InvoiceScreen.kt:604; feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/document/estimate/EstimateScreen.kt:447"
  },
  "delete_invoice_dialog": {
   "label": "Delete invoice dialog",
   "dataScreen": null,
   "kind": "dialog",
   "parent": "dashboard",
   "pictured": true,
   "states": [
    "one",
    "payments-advance",
    "payments-instalments",
    "payments-several",
    "payments-split"
   ],
   "controls": [
    {
     "key": "tap:dashboard:components_DeleteInvoiceDialog.close_1",
     "states": [
      "one",
      "payments-several"
     ]
    },
    {
     "key": "tap:dashboard:components_DeleteInvoiceDialog.yes_delete_if_invoicecount_1_2",
     "states": [
      "one",
      "payments-several"
     ]
    },
    {
     "key": "tap:dashboard:components_DeleteInvoiceDialog.cancel_3",
     "states": [
      "one",
      "payments-several"
     ]
    },
    {
     "key": "delete_inv_dailog_closed_",
     "states": [
      "payments-advance",
      "payments-instalments",
      "payments-split"
     ]
    },
    {
     "key": "delete_inv_success",
     "states": [
      "payments-advance",
      "payments-instalments",
      "payments-split"
     ]
    },
    {
     "key": "tap:saved_inv_scr:components_DeleteInvoiceDialog_2.cancel_3",
     "states": [
      "payments-advance",
      "payments-instalments",
      "payments-split"
     ]
    }
   ],
   "points": [
    {
     "match": "tap:dashboard:components_DeleteInvoiceDialog.close_1",
     "label": "Close (X), from the invoice list",
     "kind": "backward",
     "to": "dashboard",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/delete/DeleteInvoiceDialog.kt:90"
    },
    {
     "match": "tap:dashboard:components_DeleteInvoiceDialog.yes_delete_if_invoicecount_1_2",
     "label": "Yes, delete (from the invoice list: deletes the selected invoices and closes; payments listed in the dialog go with them)",
     "kind": "backward",
     "to": "dashboard",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/delete/DeleteInvoiceDialog.kt:91"
    },
    {
     "match": "tap:dashboard:components_DeleteInvoiceDialog.cancel_3",
     "label": "Cancel, from the invoice list",
     "kind": "backward",
     "to": "dashboard",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/delete/DeleteInvoiceDialog.kt:92"
    },
    {
     "match": "delete_inv_dailog_closed_",
     "label": "Close (X), from the saved invoice",
     "kind": "backward",
     "to": "saved_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/delete/DeleteInvoiceDialog.kt:83"
    },
    {
     "match": "delete_inv_success",
     "label": "Yes, delete (from the saved invoice: deletes it and the payments listed, then goes to the Invoices list)",
     "kind": "forward",
     "to": "dashboard",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/delete/DeleteInvoiceDialog.kt:84; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceViewModel.kt:381; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/InvoiceDocNavigation.kt:323"
    },
    {
     "match": "tap:saved_inv_scr:components_DeleteInvoiceDialog_2.cancel_3",
     "label": "Cancel, from the saved invoice",
     "kind": "backward",
     "to": "saved_inv_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/delete/DeleteInvoiceDialog.kt:85"
    },
    {
     "match": "@system_back",
     "label": "Android back / tap outside (closes the dialog)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from the invoice list",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "opened from the saved invoice",
       "to": "saved_inv_scr",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/delete/DeleteInvoiceDialog.kt:122"
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/delete/DeleteInvoiceDialog.kt:110; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:433; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceScreen.kt:699"
  },
  "currency_breakdown_sheet": {
   "label": "What this total is made of (sheet)",
   "dataScreen": null,
   "kind": "sheet",
   "parent": "dashboard",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "dashboard",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/components/CurrencyBreakdownSheet.kt:70"
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe sheet down (closes)",
     "kind": "backward",
     "to": "dashboard",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/components/CurrencyBreakdownSheet.kt:70"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "dashboard",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/components/CurrencyBreakdownSheet.kt:70"
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/components/CurrencyBreakdownSheet.kt:67; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListScreen.kt:488"
  },
  "document_language_sheet": {
   "label": "Received invoice language sheet",
   "dataScreen": null,
   "kind": "sheet",
   "parent": "received_invoice",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "tap:received_invoice:DocumentLanguageSheet.language_en",
     "states": []
    },
    {
     "key": "tap:received_invoice:DocumentLanguageSheet.language_es",
     "states": []
    },
    {
     "key": "tap:received_invoice:DocumentLanguageSheet.language_fr",
     "states": []
    },
    {
     "key": "tap:received_invoice:DocumentLanguageSheet.language_de",
     "states": []
    },
    {
     "key": "tap:received_invoice:DocumentLanguageSheet.language_it",
     "states": []
    },
    {
     "key": "tap:received_invoice:DocumentLanguageSheet.language_pt",
     "states": []
    },
    {
     "key": "tap:received_invoice:DocumentLanguageSheet.language_ru",
     "states": []
    },
    {
     "key": "tap:received_invoice:DocumentLanguageSheet.language_zh",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes)",
     "kind": "backward",
     "to": "received_invoice",
     "source": "feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/DocumentLanguageSheet.kt:74"
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe sheet down (closes)",
     "kind": "backward",
     "to": "received_invoice",
     "source": "feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/DocumentLanguageSheet.kt:74"
    },
    {
     "match": "re:^tap:received_invoice:DocumentLanguageSheet\\.language_",
     "label": "Pick a language (closes; the document is read in it)",
     "kind": "backward",
     "to": "received_invoice",
     "source": "feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/DocumentLanguageSheet.kt:125; feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/ReceivedInvoiceScreen.kt:364"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "backward",
     "to": "received_invoice",
     "source": "feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/DocumentLanguageSheet.kt:74"
    }
   ],
   "source": "feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/DocumentLanguageSheet.kt:66; feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/ReceivedInvoiceScreen.kt:360"
  },
  "own_footer_sheet": {
   "label": "Your footer (sheet)",
   "dataScreen": null,
   "kind": "sheet",
   "parent": "saved_inv_scr",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "label:Switch",
     "states": []
    },
    {
     "key": "label:Message · 28/60",
     "states": []
    },
    {
     "key": "label:Phone · email",
     "states": []
    },
    {
     "key": "label:WhatsApp",
     "states": []
    },
    {
     "key": "label:Website",
     "states": []
    },
    {
     "key": "label:No QR",
     "states": []
    },
    {
     "key": "label:WhatsApp number · Scans to https://wa.me/923001234567",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Tap outside the sheet (closes, nothing saved)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from the saved invoice",
       "to": "saved_inv_scr",
       "back": true
      },
      {
       "when": "opened from Preview",
       "to": "preview_invoice_scr",
       "back": true
      },
      {
       "when": "opened from the preview sheet of Create Invoice",
       "to": "off:invoice_preview_sheet",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterSheet.kt:108"
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Swipe sheet down (closes, nothing saved)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from the saved invoice",
       "to": "saved_inv_scr",
       "back": true
      },
      {
       "when": "opened from Preview",
       "to": "preview_invoice_scr",
       "back": true
      },
      {
       "when": "opened from the preview sheet of Create Invoice",
       "to": "off:invoice_preview_sheet",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterSheet.kt:108"
    },
    {
     "match": "label:Switch",
     "label": "Switches (show footer, logo, message, name, contact)",
     "kind": "stay",
     "stay": "Turns that part of the footer on or off in the live picture at the top of the sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterSheet.kt:141; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterSheet.kt:261"
    },
    {
     "match": "re:^label:(Message · \\d+/\\d+|WhatsApp number · .*)$",
     "label": "Text fields (footer message, WhatsApp number)",
     "kind": "stay",
     "stay": "Types into the footer text",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterSheet.kt:70"
    },
    {
     "match": "re:^label:(Phone · email|WhatsApp|Website|No QR)$",
     "label": "QR choice",
     "kind": "stay",
     "stay": "Chooses what the footer's QR code scans",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterSheet.kt:283"
    },
    {
     "match": "@save",
     "label": "Save",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from the saved invoice",
       "to": "saved_inv_scr",
       "back": true
      },
      {
       "when": "opened from Preview",
       "to": "preview_invoice_scr",
       "back": true
      },
      {
       "when": "opened from the preview sheet of Create Invoice",
       "to": "off:invoice_preview_sheet",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterSheet.kt:247",
     "events": [
      "own_footer_save"
     ]
    },
    {
     "match": "@cancel",
     "label": "Cancel",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from the saved invoice",
       "to": "saved_inv_scr",
       "back": true
      },
      {
       "when": "opened from Preview",
       "to": "preview_invoice_scr",
       "back": true
      },
      {
       "when": "opened from the preview sheet of Create Invoice",
       "to": "off:invoice_preview_sheet",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterSheet.kt:252",
     "events": [
      "own_footer_cancel"
     ]
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the sheet)",
     "kind": "conditional",
     "branches": [
      {
       "when": "opened from the saved invoice",
       "to": "saved_inv_scr",
       "back": true
      },
      {
       "when": "opened from Preview",
       "to": "preview_invoice_scr",
       "back": true
      },
      {
       "when": "opened from the preview sheet of Create Invoice",
       "to": "off:invoice_preview_sheet",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterSheet.kt:108"
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterSheet.kt:90; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/footer/OwnFooterPreviewHooks.kt:78"
  },
  "header_sheet": {
   "label": "Header panel (Preview → Customize → Header)",
   "dataScreen": null,
   "kind": "sheet",
   "parent": "preview_invoice_scr",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "header_back_click",
     "states": []
    },
    {
     "key": "headr_color_btn_click",
     "states": []
    },
    {
     "key": "background_fab_btn_click",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Sheet wrapper's close area",
     "kind": "stay",
     "stay": "Drawn by the picture's sheet wrapper, not in the app: there this panel is part of Preview and its own Back arrow closes it",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/header/HeaderBottomSheetContent.kt:240"
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Sheet wrapper's drag handle",
     "kind": "stay",
     "stay": "Drawn by the picture's sheet wrapper, not in the app: there this panel is part of Preview and its own Back arrow closes it",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/header/HeaderBottomSheetContent.kt:240"
    },
    {
     "match": "header_back_click",
     "label": "Back arrow",
     "kind": "conditional",
     "branches": [
      {
       "when": "on the colour or settings view: back to the header list (stays)"
      },
      {
       "when": "on the header list: closes the panel, back to the Customize cards",
       "to": "preview_invoice_scr",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/header/HeaderBottomSheetContent.kt:241; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:705"
    },
    {
     "match": "headr_color_btn_click",
     "label": "Colour button (top right)",
     "kind": "stay",
     "stay": "Opens or closes the colour view inside this panel",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/header/HeaderBottomSheetContent.kt:270"
    },
    {
     "match": "background_fab_btn_click",
     "label": "+ button (add your own header)",
     "kind": "stay",
     "stay": "Opens the Gallery / Camera menu in place",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/header/HeaderBottomSheetContent.kt:212; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/background/GradientFAB.kt:293"
    },
    {
     "match": "@gallery",
     "label": "Gallery (from the + menu)",
     "kind": "outside",
     "outside": "Gallery (system photo picker), then the cropper; the cut header is applied",
     "returnsTo": "header_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/header/HeaderBottomSheetContent.kt:184; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/header/HeaderBottomSheetContent.kt:218"
    },
    {
     "match": "@camera",
     "label": "Camera (from the + menu)",
     "kind": "outside",
     "outside": "Camera, then the cropper; the cut header is applied",
     "returnsTo": "header_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/header/HeaderBottomSheetContent.kt:185; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/header/HeaderBottomSheetContent.kt:225"
    },
    {
     "match": "@apply_header",
     "label": "A header design",
     "kind": "stay",
     "stay": "Applies it to the preview behind (applying is not leaving: the panel stays open)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/header/HeaderBottomSheetContent.kt:708",
     "events": [
      "header_apply_success"
     ]
    },
    {
     "match": "@system_back",
     "label": "Android back",
     "kind": "conditional",
     "branches": [
      {
       "when": "on the colour or settings view: back to the header list (stays)"
      },
      {
       "when": "on the header list: closes the panel, back to the Customize cards",
       "to": "preview_invoice_scr",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/header/HeaderBottomSheetContent.kt:153"
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/header/HeaderBottomSheetContent.kt:132; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:709"
  },
  "background_sheet": {
   "label": "Background panel (Preview → Customize → Background)",
   "dataScreen": null,
   "kind": "sheet",
   "parent": "preview_invoice_scr",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "background_back_click",
     "states": []
    },
    {
     "key": "tap:preview_invoice_scr:BackgroundBottomSheetContent.background_bottom_sheet_content_1",
     "states": []
    },
    {
     "key": "background_fab_btn_click",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Sheet wrapper's close area",
     "kind": "stay",
     "stay": "Drawn by the picture's sheet wrapper, not in the app: there this panel is part of Preview and its own Back arrow closes it",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/background/BackgroundBottomSheetContent.kt:203"
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Sheet wrapper's drag handle",
     "kind": "stay",
     "stay": "Drawn by the picture's sheet wrapper, not in the app: there this panel is part of Preview and its own Back arrow closes it",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/background/BackgroundBottomSheetContent.kt:203"
    },
    {
     "match": "background_back_click",
     "label": "Back arrow",
     "kind": "conditional",
     "branches": [
      {
       "when": "on the settings view: back to the background list (stays)"
      },
      {
       "when": "on the background list: closes the panel, back to the Customize cards",
       "to": "preview_invoice_scr",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/background/BackgroundBottomSheetContent.kt:204; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:705"
    },
    {
     "match": "tap:preview_invoice_scr:BackgroundBottomSheetContent.background_bottom_sheet_content_1",
     "label": "Settings button (top right)",
     "kind": "stay",
     "stay": "Opens or closes the background settings view inside this panel",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/background/BackgroundBottomSheetContent.kt:231"
    },
    {
     "match": "background_fab_btn_click",
     "label": "+ button (add your own background)",
     "kind": "stay",
     "stay": "Opens the Gallery / Camera menu in place",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/background/BackgroundBottomSheetContent.kt:175; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/background/GradientFAB.kt:293"
    },
    {
     "match": "@gallery",
     "label": "Gallery (from the + menu)",
     "kind": "outside",
     "outside": "Gallery (system photo picker), then the cropper",
     "returnsTo": "background_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/background/BackgroundBottomSheetContent.kt:153; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/background/BackgroundBottomSheetContent.kt:181"
    },
    {
     "match": "@camera",
     "label": "Camera (from the + menu)",
     "kind": "outside",
     "outside": "Camera, then the cropper",
     "returnsTo": "background_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/background/BackgroundBottomSheetContent.kt:154; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/background/BackgroundBottomSheetContent.kt:188"
    },
    {
     "match": "@apply_background",
     "label": "A background design",
     "kind": "stay",
     "stay": "Applies it to the preview behind (the panel stays open)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/background/BackgroundBottomSheetContent.kt:578",
     "events": [
      "background_apply_success"
     ]
    },
    {
     "match": "@system_back",
     "label": "Android back",
     "kind": "conditional",
     "branches": [
      {
       "when": "on the settings view: back to the background list (stays)"
      },
      {
       "when": "on the background list: closes the panel, back to the Customize cards",
       "to": "preview_invoice_scr",
       "back": true
      }
     ],
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/background/BackgroundBottomSheetContent.kt:122"
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/background/BackgroundBottomSheetContent.kt:105; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:724"
  },
  "color_sheet": {
   "label": "Colour panel (Preview → Customize → Color)",
   "dataScreen": null,
   "kind": "sheet",
   "parent": "preview_invoice_scr",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "select_color_back",
     "states": []
    },
    {
     "key": "tap:preview_invoice_scr:ColorBottomSheetContent.color_picker_1",
     "states": []
    },
    {
     "key": "select_color_added_success",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Sheet wrapper's close area",
     "kind": "stay",
     "stay": "Drawn by the picture's sheet wrapper, not in the app: there this panel is part of Preview and its own Back arrow closes it",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/color/ColorBottomSheetContent.kt:72"
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Sheet wrapper's drag handle",
     "kind": "stay",
     "stay": "Drawn by the picture's sheet wrapper, not in the app: there this panel is part of Preview and its own Back arrow closes it",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/color/ColorBottomSheetContent.kt:72"
    },
    {
     "match": "select_color_back",
     "label": "Back arrow (closes the panel)",
     "kind": "backward",
     "to": "preview_invoice_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/color/ColorBottomSheetContent.kt:73; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:705"
    },
    {
     "match": "tap:preview_invoice_scr:ColorBottomSheetContent.color_picker_1",
     "label": "Colour picker icon",
     "kind": "stay",
     "stay": "Opens the free colour picker over this panel",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/color/ColorBottomSheetContent.kt:80; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/color/ColorBottomSheetContent.kt:57"
    },
    {
     "match": "select_color_added_success",
     "label": "A shade",
     "kind": "stay",
     "stay": "Applies it to the preview behind (the panel stays open)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/color/ColorBottomSheetContent.kt:277"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the panel)",
     "kind": "backward",
     "to": "preview_invoice_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/color/ColorBottomSheetContent.kt:52"
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/color/ColorBottomSheetContent.kt:45; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:701"
  },
  "settings_sheet": {
   "label": "Invoice settings panel (Preview → Customize → Settings)",
   "dataScreen": null,
   "kind": "sheet",
   "parent": "preview_invoice_scr",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    },
    {
     "key": "setting_back_click",
     "states": []
    },
    {
     "key": "tap:preview_invoice_scr:SettingsBottomSheetContent.toggle_settings_item_row_1",
     "states": []
    },
    {
     "key": "tap:preview_invoice_scr:SettingsBottomSheetContent.i_o_s_switch_3",
     "states": []
    },
    {
     "key": "settings_align_left",
     "states": []
    },
    {
     "key": "settings_align_center",
     "states": []
    },
    {
     "key": "settings_align_right",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Sheet wrapper's close area",
     "kind": "stay",
     "stay": "Drawn by the picture's sheet wrapper, not in the app: there this panel is part of Preview and its own Back arrow closes it",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/settings/SettingsBottomSheetContent.kt:113"
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Sheet wrapper's drag handle",
     "kind": "stay",
     "stay": "Drawn by the picture's sheet wrapper, not in the app: there this panel is part of Preview and its own Back arrow closes it",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/settings/SettingsBottomSheetContent.kt:113"
    },
    {
     "match": "setting_back_click",
     "label": "Back arrow (closes the panel)",
     "kind": "backward",
     "to": "preview_invoice_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/settings/SettingsBottomSheetContent.kt:114; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/settings/SettingsBottomSheetContent.kt:89"
    },
    {
     "match": "re:^tap:preview_invoice_scr:SettingsBottomSheetContent\\.(toggle_settings_item_row_1|i_o_s_switch_3)$",
     "label": "Setting row / its switch",
     "kind": "stay",
     "stay": "Turns the setting on or off; the preview behind redraws",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/settings/SettingsBottomSheetContent.kt:239; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/settings/SettingsBottomSheetContent.kt:556"
    },
    {
     "match": "re:^settings_align_(left|center|right)$",
     "label": "Text alignment",
     "kind": "stay",
     "stay": "Sets how the document's text is aligned; the preview behind redraws",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/settings/SettingsBottomSheetContent.kt:331"
    },
    {
     "match": "@system_back",
     "label": "Android back (closes the panel)",
     "kind": "backward",
     "to": "preview_invoice_scr",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/settings/SettingsBottomSheetContent.kt:82"
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/settings/SettingsBottomSheetContent.kt:72; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:769"
  },
  "template_sheet": {
   "label": "Templates panel (Preview → Templates)",
   "dataScreen": null,
   "kind": "sheet",
   "parent": "preview_invoice_scr",
   "pictured": true,
   "states": [
    "open"
   ],
   "controls": [
    {
     "key": "label:Close sheet",
     "states": []
    },
    {
     "key": "label:Drag handle. Swipe down to close.",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Close sheet",
     "label": "Sheet wrapper's close area",
     "kind": "stay",
     "stay": "Drawn by the picture's sheet wrapper, not in the app: there the templates are the Preview screen's own lower half",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/template/InvoiceTemplatesBottomSheetContent.kt:102"
    },
    {
     "match": "label:Drag handle. Swipe down to close.",
     "label": "Sheet wrapper's drag handle",
     "kind": "stay",
     "stay": "Drawn by the picture's sheet wrapper, not in the app: there the templates are the Preview screen's own lower half",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/template/InvoiceTemplatesBottomSheetContent.kt:102"
    },
    {
     "match": "@pick_template",
     "label": "A template",
     "kind": "stay",
     "stay": "Applies it to the preview behind (the Save button wakes once the design changed)",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/template/InvoiceTemplatesBottomSheetContent.kt:468",
     "events": [
      "temeplate_apply_success"
     ]
    },
    {
     "match": "@placeholder_header",
     "label": "'Header' button on the custom-template placeholder card",
     "kind": "forward",
     "to": "header_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/template/InvoiceTemplatesBottomSheetContent.kt:602; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:124"
    },
    {
     "match": "@placeholder_background",
     "label": "'Background' button on the custom-template placeholder card",
     "kind": "forward",
     "to": "background_sheet",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/template/InvoiceTemplatesBottomSheetContent.kt:634; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:132"
    },
    {
     "match": "@system_back",
     "label": "Android back (this panel has none of its own: leaves Preview, to the Invoices list)",
     "kind": "backward",
     "to": "dashboard",
     "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/PreviewInvoiceScreen.kt:164"
    }
   ],
   "source": "feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/bottomSheet/template/InvoiceTemplatesBottomSheetContent.kt:102; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/preview/components/ContentType.kt:180"
  },
  "appearance_scr": {
   "label": "Appearance",
   "dataScreen": "appearance_settings",
   "kind": "screen",
   "parent": "dashboard",
   "pictured": true,
   "states": [
    "default"
   ],
   "controls": [
    {
     "key": "tap:appearance_scr:AppearanceScreen.theme_option",
     "states": []
    },
    {
     "key": "appearance_screen_close",
     "states": []
    }
   ],
   "points": [
    {
     "match": "tap:appearance_scr:AppearanceScreen.theme_option",
     "label": "Theme option",
     "kind": "stay",
     "stay": "Picks that theme and applies it at once",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/settings/AppearanceScreen.kt:242; composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/settings/AppearanceScreen.kt:226"
    },
    {
     "match": "appearance_screen_close",
     "label": "Back arrow",
     "kind": "conditional",
     "branches": [
      {
       "when": "drawer was opened on the Invoices list",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "drawer was opened on the Estimates list",
       "to": "estimate_scr",
       "back": true
      }
     ],
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/settings/AppearanceScreen.kt:101; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:784"
    },
    {
     "match": "@system_back",
     "label": "Android back (NavHost pops)",
     "kind": "conditional",
     "branches": [
      {
       "when": "drawer was opened on the Invoices list",
       "to": "dashboard",
       "back": true
      },
      {
       "when": "drawer was opened on the Estimates list",
       "to": "estimate_scr",
       "back": true
      }
     ],
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:810"
    }
   ],
   "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/settings/AppearanceScreen.kt:83; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:810"
  },
  "business_details_scr": {
   "label": "Business details",
   "dataScreen": "business_details",
   "kind": "screen",
   "parent": "business_list",
   "pictured": true,
   "states": [
    "default"
   ],
   "controls": [
    {
     "key": "tap:business_details_scr:BusinessDetailsScreen.action_edit_business",
     "states": []
    },
    {
     "key": "tap:business_details_scr:BusinessDetailsScreen.attach_money_2",
     "states": []
    },
    {
     "key": "business_details_screen_close",
     "states": []
    },
    {
     "key": "tap:business_details_scr:BusinessDetailsScreen.edit_business_1",
     "states": []
    }
   ],
   "points": [
    {
     "match": "tap:business_details_scr:BusinessDetailsScreen.edit_business_1",
     "label": "Edit (top bar pencil)",
     "kind": "forward",
     "to": "edit_business",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessDetails/BusinessDetailsScreen.kt:102; feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/navigation/BusinessNavigation.kt:86"
    },
    {
     "match": "tap:business_details_scr:BusinessDetailsScreen.action_edit_business",
     "label": "Edit business (button)",
     "kind": "forward",
     "to": "edit_business",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessDetails/BusinessDetailsScreen.kt:194; feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/navigation/BusinessNavigation.kt:86"
    },
    {
     "match": "tap:business_details_scr:BusinessDetailsScreen.attach_money_2",
     "label": "Currency (change)",
     "kind": "stay",
     "stay": "Opens the currency dialog in place",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessDetails/BusinessDetailsScreen.kt:393; feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessDetails/BusinessDetailsScreen.kt:134"
    },
    {
     "match": "business_details_screen_close",
     "label": "Back arrow",
     "kind": "backward",
     "to": "business_list",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessDetails/BusinessDetailsScreen.kt:95; feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/navigation/BusinessNavigation.kt:72"
    },
    {
     "match": "@set_default",
     "label": "Set as default (not drawn while this business already is the default)",
     "kind": "stay",
     "stay": "Makes this business the default one for new invoices",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessDetails/BusinessDetailsScreen.kt:203",
     "events": [
      "tap:business_details_scr:BusinessDetailsScreen.action_set_as_default"
     ]
    },
    {
     "match": "@system_back",
     "label": "Android back (NavHost pops)",
     "kind": "backward",
     "to": "business_list",
     "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/navigation/BusinessNavigation.kt:78"
    }
   ],
   "source": "feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/presentation/businessDetails/BusinessDetailsScreen.kt:64; feature/company/src/commonMain/kotlin/invotick/invoicemaker/feature/company/navigation/BusinessNavigation.kt:78"
  },
  "create_expense_scr": {
   "label": "New expense",
   "dataScreen": "create_expense",
   "kind": "screen",
   "parent": "expense_list",
   "pictured": true,
   "states": [
    "empty",
    "error",
    "filled"
   ],
   "controls": [
    {
     "key": "tap:create_expense_scr:BusinessSelectionComponents.business_card",
     "states": []
    },
    {
     "key": "tap:create_expense_scr:ReceiptImageCard.add_image_empty",
     "states": []
    },
    {
     "key": "tap:create_expense_scr:QuickEntryCards.merchant_card",
     "states": []
    },
    {
     "key": "tap:create_expense_scr:QuickEntryCards.date_card",
     "states": []
    },
    {
     "key": "tap:create_expense_scr:QuickEntryCards.category_card",
     "states": []
    },
    {
     "key": "label:$ · 0.00",
     "states": [
      "empty",
      "error"
     ]
    },
    {
     "key": "label:Add notes about this expense...",
     "states": [
      "empty",
      "error"
     ]
    },
    {
     "key": "label:$",
     "states": [
      "filled"
     ]
    },
    {
     "key": "nolabel@35,1140,685,1245",
     "states": [
      "filled"
     ]
    }
   ],
   "points": [
    {
     "match": "tap:create_expense_scr:BusinessSelectionComponents.business_card",
     "label": "Business card",
     "kind": "stay",
     "stay": "Opens the business list sheet in place; picking a business sets it",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/createExpense/components/BusinessSelectionComponents.kt:44; feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/createExpense/CreateExpenseScreen.kt:87"
    },
    {
     "match": "tap:create_expense_scr:ReceiptImageCard.add_image_empty",
     "label": "Add receipt image",
     "kind": "stay",
     "stay": "Opens the 'choose image' sheet (camera or gallery) in place",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/createExpense/components/ReceiptImageCard.kt:118; feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/createExpense/CreateExpenseScreen.kt:258"
    },
    {
     "match": "tap:create_expense_scr:QuickEntryCards.merchant_card",
     "label": "Merchant card",
     "kind": "stay",
     "stay": "Opens the merchant sheet in place (a list, with creating a merchant inside it)",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/createExpense/components/QuickEntryCards.kt:55; feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/createExpense/CreateExpenseScreen.kt:282"
    },
    {
     "match": "tap:create_expense_scr:QuickEntryCards.date_card",
     "label": "Date card",
     "kind": "stay",
     "stay": "Opens the date picker over the screen",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/createExpense/components/QuickEntryCards.kt:123; feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/createExpense/CreateExpenseScreen.kt:73"
    },
    {
     "match": "tap:create_expense_scr:QuickEntryCards.category_card",
     "label": "Category card",
     "kind": "stay",
     "stay": "Opens the category sheet in place",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/createExpense/components/QuickEntryCards.kt:189; feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/createExpense/CreateExpenseScreen.kt:282"
    },
    {
     "match": "re:^(label:\\$.*|label:Add notes about this expense\\.\\.\\.|nolabel@35,1140,685,1245)$",
     "label": "Amount, tax and notes fields",
     "kind": "stay",
     "stay": "Types into the field",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/createExpense/CreateExpenseScreen.kt:326"
    },
    {
     "match": "@back",
     "label": "Back arrow",
     "kind": "backward",
     "to": "expense_list",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/createExpense/CreateExpenseScreen.kt:135; feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/navigation/ExpenseNavigation.kt:81",
     "events": [
      "create_expense_screen_close"
     ]
    },
    {
     "match": "@save",
     "label": "Save (top right; dimmed until the form can be saved)",
     "kind": "backward",
     "to": "expense_list",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/createExpense/CreateExpenseScreen.kt:148; feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/createExpense/CreateExpenseViewModel.kt:410"
    },
    {
     "match": "@system_back",
     "label": "Android back (NavHost pops)",
     "kind": "backward",
     "to": "expense_list",
     "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/navigation/ExpenseNavigation.kt:77"
    }
   ],
   "source": "feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/presentation/createExpense/CreateExpenseScreen.kt:43; feature/expense/src/commonMain/kotlin/invotick/invoicemaker/feature/expense/navigation/ExpenseNavigation.kt:77"
  },
  "payment_form_scr": {
   "label": "Add payment (payment form)",
   "dataScreen": "create_payment_form",
   "kind": "screen",
   "parent": "off:payment_form_list",
   "pictured": true,
   "states": [
    "filled"
   ],
   "controls": [
    {
     "key": "nolabel@21,663,699,761",
     "states": []
    },
    {
     "key": "tap:payment_form_scr:TextFiedl.invotick_clickable_text_field_2",
     "states": []
    },
    {
     "key": "nolabel@21,799,699,898",
     "states": []
    },
    {
     "key": "label:Select date",
     "states": []
    },
    {
     "key": "tap:payment_form_scr:PaymentFormScreen.allocate_payment_1",
     "states": []
    },
    {
     "key": "tap:payment_form_scr:PaymentFormTopBar.back_1",
     "states": []
    }
   ],
   "points": [
    {
     "match": "re:^(nolabel@21,663,699,761|nolabel@21,799,699,898|label:Select date)$",
     "label": "Amount, payment method and date fields",
     "kind": "stay",
     "stay": "Amount: types. Method: opens a dropdown in place. Date: nothing opens, its tap handler is empty (onDateClick = { })",
     "source": "feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/presentation/createPaymentForm/PaymentFormScreen.kt:143; feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/presentation/createPaymentForm/components/PaymentMethodSelector.kt:60"
    },
    {
     "match": "tap:payment_form_scr:TextFiedl.invotick_clickable_text_field_2",
     "label": "Payment method / date field",
     "kind": "stay",
     "stay": "Method: opens a dropdown in place. Date: nothing opens, its tap handler is empty (onDateClick = { })",
     "source": "feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/presentation/createPaymentForm/PaymentFormScreen.kt:143"
    },
    {
     "match": "tap:payment_form_scr:PaymentFormScreen.allocate_payment_1",
     "label": "Allocate Payment",
     "kind": "conditional",
     "branches": [
      {
       "when": "amount empty or invalid, or the client has no unpaid invoice: a message, stays here"
      },
      {
       "when": "otherwise an allocation dialog opens over this screen; its Confirm saves the payments and goes back to the client's payment list",
       "to": "off:payment_form_list",
       "back": true
      }
     ],
     "source": "feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/presentation/createPaymentForm/PaymentFormScreen.kt:146; feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/presentation/createPaymentForm/PaymentFormViewModel.kt:165,152; feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/presentation/createPaymentForm/PaymentFormScreen.kt:51"
    },
    {
     "match": "tap:payment_form_scr:PaymentFormTopBar.back_1",
     "label": "Back arrow",
     "kind": "backward",
     "to": "off:payment_form_list",
     "source": "feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/presentation/createPaymentForm/components/PaymentFormTopBar.kt:36; feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/navigation/PaymentFormNavigation.kt:101"
    },
    {
     "match": "@system_back",
     "label": "Android back (NavHost pops)",
     "kind": "backward",
     "to": "off:payment_form_list",
     "source": "feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/navigation/PaymentFormNavigation.kt:92"
    }
   ],
   "source": "feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/presentation/createPaymentForm/PaymentFormScreen.kt:36; feature/paymentForm/src/commonMain/kotlin/invotick/invoicemaker/feature/paymentform/navigation/PaymentFormNavigation.kt:92"
  },
  "received_invoice_list": {
   "label": "Received invoices list",
   "dataScreen": "received_invoice_list",
   "kind": "screen",
   "parent": "tools_scr",
   "pictured": true,
   "states": [
    "empty",
    "filled"
   ],
   "controls": [
    {
     "key": "tap:received_invoice_list:ReceivedInvoiceList.back_1",
     "states": []
    },
    {
     "key": "tap:received_invoice_list:ReceivedInvoiceList.open_invoice_1",
     "states": [
      "filled"
     ]
    }
   ],
   "points": [
    {
     "match": "tap:received_invoice_list:ReceivedInvoiceList.open_invoice_1",
     "label": "A received invoice (one row per invoice; a row whose link no longer works says so and still opens)",
     "kind": "forward",
     "to": "received_invoice",
     "source": "feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/ReceivedInvoiceListScreen.kt:130; feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/navigation/ReceivedInvoiceNavigation.kt:59"
    },
    {
     "match": "tap:received_invoice_list:ReceivedInvoiceList.back_1",
     "label": "Back arrow",
     "kind": "backward",
     "to": "tools_scr",
     "source": "feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/ReceivedInvoiceListScreen.kt:80; feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/navigation/ReceivedInvoiceNavigation.kt:41"
    },
    {
     "match": "@system_back",
     "label": "Android back (NavHost pops)",
     "kind": "backward",
     "to": "tools_scr",
     "source": "feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/navigation/ReceivedInvoiceNavigation.kt:54"
    }
   ],
   "source": "feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/presentation/ReceivedInvoiceListScreen.kt:59; feature/receivedInvoice/src/commonMain/kotlin/invotick/invoicemaker/feature/receivedInvoice/navigation/ReceivedInvoiceNavigation.kt:54"
  },
  "add_account_scr": {
   "label": "Add account",
   "dataScreen": "add_account",
   "kind": "screen",
   "parent": "dashboard",
   "pictured": true,
   "states": [
    "default"
   ],
   "controls": [
    {
     "key": "tap:add_account_scr:AddAccountScreen.sign_in_1",
     "states": []
    },
    {
     "key": "tap:add_account_scr:AddAccountScreen.new_guest_2",
     "states": []
    },
    {
     "key": "tap:add_account_scr:AddAccountScreen.go_back_3",
     "states": []
    }
   ],
   "points": [
    {
     "match": "tap:add_account_scr:AddAccountScreen.sign_in_1",
     "label": "Sign in",
     "kind": "forward",
     "to": "login_scr",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/accounts/AddAccount.kt:187; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/AppNavHost.kt:153"
    },
    {
     "match": "tap:add_account_scr:AddAccountScreen.new_guest_2",
     "label": "Start as a new guest",
     "kind": "conditional",
     "branches": [
      {
       "when": "the new guest is created on the phone: opens its dashboard",
       "to": "dashboard"
      },
      {
       "when": "it cannot be created: a message, stays here",
       "to": "add_account_scr"
      }
     ],
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/accounts/AddAccount.kt:193; composeApp/src/commonMain/kotlin/invotick/invoicemaker/accounts/AddAccount.kt:112; composeApp/src/commonMain/kotlin/invotick/invoicemaker/accounts/AddAccount.kt:114"
    },
    {
     "match": "tap:add_account_scr:AddAccountScreen.go_back_3",
     "label": "Cancel (back to the account that was open; the empty new place is forgotten)",
     "kind": "backward",
     "to": "dashboard",
     "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/accounts/AddAccount.kt:199; composeApp/src/commonMain/kotlin/invotick/invoicemaker/accounts/AddAccount.kt:132"
    }
   ],
   "source": "composeApp/src/commonMain/kotlin/invotick/invoicemaker/accounts/AddAccount.kt:141; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/AppNavHost.kt:409"
  },
  "signup_scr": {
   "label": "Sign up with email",
   "dataScreen": "signup_scr",
   "kind": "screen",
   "parent": "register_acc_scr",
   "pictured": true,
   "states": [
    "filled-error"
   ],
   "controls": [
    {
     "key": "label:Username",
     "states": []
    },
    {
     "key": "label:Email · Enter a valid email",
     "states": []
    },
    {
     "key": "label:Password key · Show password · At least 8 characters",
     "states": []
    },
    {
     "key": "tap:signup_scr:TextFiedl.password_text_field_3",
     "states": []
    },
    {
     "key": "label:Password key · Show password · Passwords do not match",
     "states": []
    },
    {
     "key": "signup_button_click",
     "states": []
    }
   ],
   "points": [
    {
     "match": "re:^label:(Username|Email.*|Password key.*)$",
     "label": "Username, email, password and confirm-password fields",
     "kind": "stay",
     "stay": "Types into the field (errors are shown under it)",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/signup/SignupScreen.kt:197"
    },
    {
     "match": "tap:signup_scr:TextFiedl.password_text_field_3",
     "label": "Show password",
     "kind": "stay",
     "stay": "Shows or hides the password text",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/signup/SignupScreen.kt:197"
    },
    {
     "match": "signup_button_click",
     "label": "Sign up",
     "kind": "conditional",
     "branches": [
      {
       "when": "a field is invalid, or the server refuses: the error is shown, stays here"
      },
      {
       "when": "account created: a code is e-mailed and the verification screen opens",
       "to": "otp_scr"
      }
     ],
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/signup/SignupViewModel.kt:187; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:127"
    },
    {
     "match": "@back",
     "label": "Back arrow",
     "kind": "backward",
     "to": "register_acc_scr",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/signup/SignupScreen.kt:109; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:123",
     "events": [
      "signup_back_click"
     ]
    },
    {
     "match": "@system_back",
     "label": "Android back (NavHost pops)",
     "kind": "backward",
     "to": "register_acc_scr",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:120"
    }
   ],
   "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/signup/SignupScreen.kt:74; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:120"
  },
  "forgot_password_scr": {
   "label": "Forgot password",
   "dataScreen": "forgot_password_scr",
   "kind": "screen",
   "parent": "login_scr",
   "pictured": true,
   "states": [
    "default"
   ],
   "controls": [
    {
     "key": "label:Email · Enter your email",
     "states": []
    },
    {
     "key": "send_email_click",
     "states": []
    }
   ],
   "points": [
    {
     "match": "label:Email · Enter your email",
     "label": "Email field",
     "kind": "stay",
     "stay": "Types the email",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/forgot/ForgotPasswordScreen.kt:184"
    },
    {
     "match": "send_email_click",
     "label": "Send email",
     "kind": "conditional",
     "branches": [
      {
       "when": "the email is invalid or the server refuses: the error is shown, stays here"
      },
      {
       "when": "accepted: a code is e-mailed and the verification screen opens",
       "to": "otp_scr"
      }
     ],
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/forgot/ForgotPasswordViewModel.kt:91; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:144"
    },
    {
     "match": "@back",
     "label": "Back arrow",
     "kind": "backward",
     "to": "login_scr",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/forgot/ForgotPasswordScreen.kt:103; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:123",
     "events": [
      "forgot_password_screen_close"
     ]
    },
    {
     "match": "@system_back",
     "label": "Android back (NavHost pops)",
     "kind": "backward",
     "to": "login_scr",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:137"
    }
   ],
   "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/forgot/ForgotPasswordScreen.kt:69; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:137"
  },
  "otp_scr": {
   "label": "OTP verification",
   "dataScreen": "otp_verfication_scr",
   "kind": "screen",
   "parent": "login_scr",
   "pictured": true,
   "states": [
    "default"
   ],
   "controls": [
    {
     "key": "nolabel@45,1213,138,1306",
     "states": []
    },
    {
     "key": "nolabel@152,1213,246,1306",
     "states": []
    },
    {
     "key": "nolabel@260,1213,353,1306",
     "states": []
    },
    {
     "key": "nolabel@367,1213,461,1306",
     "states": []
    },
    {
     "key": "nolabel@475,1213,568,1306",
     "states": []
    },
    {
     "key": "nolabel@582,1213,676,1306",
     "states": []
    },
    {
     "key": "Verify",
     "states": []
    }
   ],
   "points": [
    {
     "match": "re:^nolabel@",
     "label": "Code digit boxes (six)",
     "kind": "stay",
     "stay": "Types the digits of the code. The sixth digit verifies the code by itself, exactly as the Verify button does (see it)",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/otp/OtpVerificationScreen.kt:218,222"
    },
    {
     "match": "Verify",
     "label": "Verify",
     "kind": "conditional",
     "branches": [
      {
       "when": "wrong or expired code: the error is shown, stays here"
      },
      {
       "when": "code from Sign up or Login is right: the account opens its dashboard",
       "to": "dashboard"
      },
      {
       "when": "code from Forgot password is right: the new-password screen opens",
       "to": "reset_password_scr"
      }
     ],
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:169; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:172; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/otp/OtpVerificationViewModel.kt:288"
    },
    {
     "match": "@resend",
     "label": "Resend code (after the countdown)",
     "kind": "stay",
     "stay": "Sends a new code",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/otp/components/ResendCodeSection.kt:40",
     "events": [
      "tap:otp_scr:ResendCodeSection.resend_code_section_1"
     ]
    },
    {
     "match": "@back",
     "label": "Back arrow",
     "kind": "conditional",
     "branches": [
      {
       "when": "reached from Login (email not verified yet)",
       "to": "login_scr",
       "back": true
      },
      {
       "when": "reached from Sign up",
       "to": "signup_scr",
       "back": true
      },
      {
       "when": "reached from Forgot password",
       "to": "forgot_password_scr",
       "back": true
      }
     ],
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/otp/OtpVerificationScreen.kt:134; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:123",
     "events": [
      "otp_verification_screen_close"
     ]
    },
    {
     "match": "@system_back",
     "label": "Android back (NavHost pops)",
     "kind": "conditional",
     "branches": [
      {
       "when": "reached from Login (email not verified yet)",
       "to": "login_scr",
       "back": true
      },
      {
       "when": "reached from Sign up",
       "to": "signup_scr",
       "back": true
      },
      {
       "when": "reached from Forgot password",
       "to": "forgot_password_scr",
       "back": true
      }
     ],
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:157"
    }
   ],
   "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/otp/OtpVerificationScreen.kt:81; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:157"
  },
  "reset_password_scr": {
   "label": "Reset password",
   "dataScreen": "reset_password",
   "kind": "screen",
   "parent": "otp_scr",
   "pictured": true,
   "states": [
    "default"
   ],
   "controls": [
    {
     "key": "label:Enter your new password · Show password",
     "states": []
    },
    {
     "key": "tap:reset_password_scr:TextFiedl.password_text_field_3",
     "states": []
    },
    {
     "key": "label:Confirm your new password · Show password",
     "states": []
    },
    {
     "key": "Reset Password",
     "states": []
    }
   ],
   "points": [
    {
     "match": "re:^label:(Enter your new password|Confirm your new password)",
     "label": "New and confirm-password fields",
     "kind": "stay",
     "stay": "Types into the field (errors are shown under it)",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/reset/ResetPasswordScreen.kt:59"
    },
    {
     "match": "tap:reset_password_scr:TextFiedl.password_text_field_3",
     "label": "Show password",
     "kind": "stay",
     "stay": "Shows or hides the password text",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/reset/ResetPasswordScreen.kt:59"
    },
    {
     "match": "Reset Password",
     "label": "Reset Password",
     "kind": "conditional",
     "branches": [
      {
       "when": "a field is invalid or the server refuses: the error is shown, stays here"
      },
      {
       "when": "password changed: the login screen opens",
       "to": "login_scr"
      }
     ],
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/reset/ResetPasswordViewModel.kt:167; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:205"
    },
    {
     "match": "@back",
     "label": "Back arrow (goes to the login screen)",
     "kind": "backward",
     "to": "login_scr",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/reset/ResetPasswordScreen.kt:112; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:95",
     "events": [
      "reset_password_screen_close"
     ]
    },
    {
     "match": "@system_back",
     "label": "Android back (NavHost pops)",
     "kind": "backward",
     "to": "otp_scr",
     "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:193"
    }
   ],
   "source": "feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/reset/ResetPasswordScreen.kt:74; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/navigation/AuthNavigation.kt:193"
  }
 },
 "unreachable": {
  "landing_scr": "LandingScreen is declared and never composed: nothing in the app calls it and AuthRoute has no Landing route; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/landing/LandingScreen.kt:60",
  "user_profile_scr": "UserRoute.Profile is opened only through ToolsScreen's onProfileClick, which ToolsScreen declares and never calls; the drawer's account card sends NavigateToProfile to an empty handler (onNavigateToProfile = {}); composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/ToolsColors.kt:81; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:480",
  "business_ledger_scr": "BusinessRoute.Ledger is opened only by the drawer item 'business_ledger', and the drawer's Reports section that held it is commented out; composeApp/src/commonMain/kotlin/invotick/invoicemaker/components/drawer/components/DrawerMenuSection.kt:112,279; composeApp/src/commonMain/kotlin/invotick/invoicemaker/app/navigation/MainShellNavigation.kt:1090",
  "rewarded_ad_gate_sheet": "RewardedAdGateSheet has no caller in the app: FeatureAccessManager.requestAccess, which would show it, is never called; feature/premium/src/commonMain/kotlin/invotick/invoicemaker/feature/premium/presentation/RewardedAdGateSheet.kt:37; domain/src/commonMain/kotlin/invotick/invoicemaker/domain/usecase/FeatureAccessManager.kt:46",
  "feature_locked_dialog": "the saved invoice sets showGuestModeDialog only in code that is commented out, so the dialog never opens; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceViewModel.kt:544; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/save/SaveInvoiceScreen.kt:713",
  "guest_mode_dialog": "nothing sends ShowGuestModeDialog to the Invoices or Estimates list, so its guest dialog never opens; feature/document/invoice/src/commonMain/kotlin/invotick/invoicemaker/feature/invoice/presentation/list/InvoiceListViewModel.kt:384; feature/document/estimate/src/commonMain/kotlin/invotick/invoicemaker/feature/estimate/presentation/list/EstimateListViewModel.kt:287",
  "guest_data_transfer_dialog": "GuestDataTransferDialog is declared and never shown: nothing in the app calls it; feature/auth/src/commonMain/kotlin/invotick/invoicemaker/feature/auth/presentation/common/GuestDataTransferDialog.kt:83"
 }
};
