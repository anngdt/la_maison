# La Maison

A calm, adaptive household maintenance app with all 41 tasks embedded from the 2026 workbook. No installation or account is required.

## Run on Windows

Double-click `index.html`. Your task data is saved in that browser on that device.

## Deploy to Netlify

Drag the unzipped `la-maison-app` folder into Netlify Drop, or connect the folder through Git. No build command is needed; the publish directory is `.`.

## How recommendations work

Tasks must fit the selected time. The visible score is Effort + Priority + Overdue Weight. Recommendations then balance that score with recurrence timing, overdue pressure, skip history, room, and bundle fit. Completion resets the recurrence clock and synchronizes Home, Tasks, Calendar, and Library.
