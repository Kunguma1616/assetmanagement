import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const startVehicleConditionTour = () => {
  const steps = [
    {
      element: "#vcr-search",
      popover: {
        title: "Search Vehicle",
        description:
          "Search using van number, registration, or vehicle ID to quickly find a specific VCR report.",
        side: "bottom" as const,
        align: "start" as const,
      },
    },
    {
      element: "#kpi-total",
      popover: {
        title: "Total Engineers",
        description:
          "This shows the total number of active engineers allocated under your trade group.",
        side: "bottom" as const,
        align: "start" as const,
      },
    },
    {
      element: "#kpi-submitted",
      popover: {
        title: "Submitted VCRs",
        description:
          "This shows how many engineers have submitted their Vehicle Condition Reports within the required timeframe.",
        side: "bottom" as const,
        align: "start" as const,
      },
    },
    {
      element: "#kpi-not-submitted",
      popover: {
        title: "Missing / Overdue VCRs",
        description:
          "This highlights engineers who have not submitted their VCRs or are overdue. Click here to view and take action.",
        side: "bottom" as const,
        align: "start" as const,
      },
    },
    {
      element: "#filter-bar",
      popover: {
        title: "Filters",
        description:
          "Use filters to narrow results by date, trade group, location, or sub-trade. This helps you quickly identify compliance issues.",
        side: "top" as const,
        align: "start" as const,
      },
    },
    {
      element: "#not-submitted-table",
      popover: {
        title: "Take Action",
        description:
          "This section shows the engineers who have not submitted their VCR. As a TGM, this is the main area to check and follow up on.",
        side: "top" as const,
        align: "start" as const,
      },
    },
    {
      element: "#submitted-table",
      popover: {
        title: "Open Engineer Report",
        description:
          "Click any engineer name in the Submitted table to open the VCR popup with the latest report and attached images.",
        side: "top" as const,
        align: "start" as const,
      },
    },
    {
      popover: {
        title: "VCR Popup",
        description:
          "Inside the popup, you will see the latest report details and all attached vehicle images for that engineer.",
        side: "top" as const,
        align: "start" as const,
      },
    },
    {
      popover: {
        title: "Analyse Images with AI",
        description:
          "In the popup, click the Analyse Images with AI button to send the attached images for AI condition review. The system will then show that AI is analysing vehicle images, which may take 10 to 30 seconds.",
        side: "top" as const,
        align: "start" as const,
      },
    },
    {
      popover: {
        title: "AI Fleet Assessment",
        description:
          "Once complete, the AI review shows image-by-image condition findings, risk level, and whether action is required, helping you decide what needs follow-up.",
        side: "top" as const,
        align: "start" as const,
      },
    },
  ].filter((step) => !step.element || document.querySelector(step.element));

  const driverObj = driver({
    showProgress: true,
    animate: true,
    overlayOpacity: 0.6,
    allowClose: true,
    steps,
  });

  driverObj.drive();
};

export default startVehicleConditionTour;
