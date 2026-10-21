# AITU Lost & Found — ICT Stage 1

Private interactive interface prototype for Alua, Arailym and Adiya.

Open the deployed Site to find a sample item, post a found item, upload an optional photo, view your local reports, and save a demo ownership claim. The coordinator simulation can review claims and flags and mark a handover as returned.

## Users and scope

Students search for belongings and report discoveries. A campus coordinator reviews reports and assists with verified returns. The prototype is browser-local: no university authentication, shared database, automatic matching, notification delivery or real messaging is implemented. Sites hosts the static interface privately. This is an optional interface demonstration for Stage 1, not a complete campus service.

## Survey evidence

Context: current Student Survey CSV export, 102 responses dated 4–5 October 2026. No individual responses, timestamps or private survey data are included in the source.

- 71 have lost an item; 68 have found an item.
- 54 selected search as the most useful feature; 19 selected photos; 17 selected location.
- 36 do not know where to report an item; 20 find searching difficult; 14 say information is scattered across chats.
- 90 selected Definitely yes or Probably yes to using the service (88.2%). One additional response was conditional and is not included in that numerator.

These results prioritise one noticeboard, search and filters, a short report form, optional photos, location and date.

## Part D interface annotations

1. Search screen: recognition rather than recall (visible item illustrations, descriptions and category choices); user control and freedom (reset, adjustable filters, close and cancel).
2. Report screen: error prevention (clear required fields, sensible date bounds, privacy guidance); visibility of system status (field errors, added listing and save confirmation).
3. Accessibility: visible keyboard focus, labelled inputs, keyboard tab navigation, native modal dialogs, alt text for uploaded photos, reduced-motion support, responsive 360 px layout and 44 px main touch targets.

## Demonstration steps

1. Search `keys`, filter Main entrance, open the matching card.
2. Choose This might be mine, enter a private identifying detail and test email, save a demo claim.
3. Report a found item: item name, category, date, location, description, handover and privacy checkbox. A photo is optional.
4. Reopen it in My reports. Refresh to demonstrate browser-local persistence.
5. Open Coordinator demo to review claims and mark an item returned, then filter Returned to owner.

The source uses buildless HTML, CSS and JavaScript. Data operations are isolated in `dist/model.js` for validation. No third-party runtime dependencies or external image requests are required.
