/*
  Reusable calendar UI component.

  This component wraps React DayPicker with the app's shared button styles, Tailwind classes, and custom month navigation icons.

  Provenance:
  - shadcn (no date) ‘Calendar’ [online]. Available from:
    https://ui.shadcn.com/docs/components/calendar
    Used for the reusable calendar component pattern and styling approach.

  - React DayPicker (no date) ‘DayPicker’ [online]. Available from:
    https://daypicker.dev/
    Used for the underlying calendar and date selection behaviour.

  - Lucide (no date) ‘Lucide React’ [online]. Available from:
    https://lucide.dev/guide/packages/lucide-react
    Used for the left and right calendar navigation icons.

  - React (no date) ‘Components’ [online]. Available from:
    https://react.dev/learn/your-first-component
    Used for the React component structure and props typing.

  - Tailwind Labs (no date) ‘Styling with utility classes’ [online]. Available from:
    https://tailwindcss.com/docs/styling-with-utility-classes
    Used for the component styling classes.
*/

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// Uses DayPicker's props as the Calendar component props
export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// Renders the app's styled calendar component.
function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        // Layout styles for months, captions, navigation, and days
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",

        // Styles the previous and next month buttons
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",

        // Table and weekday header styling
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",

        // Day cell styling, including range and selected states
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",

        // Allows callers to override or add DayPicker class names
        ...classNames,
      }}
      components={{
        // Replaces DayPicker's default navigation icons
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

// Exports the styled calendar for use across the app
export { Calendar };