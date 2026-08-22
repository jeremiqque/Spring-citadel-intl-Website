// Shared className for every native <select> in an admin filter row
// (students/teachers/grades). These stay plain <select> elements rather
// than the Radix Select used elsewhere, because they live inside plain GET
// forms — every filter combination has to work as a shareable URL with no
// JS, which a native select gives for free and Radix's (built on a hidden
// input + JS-driven display) does not. Centralizing the class string here
// means a future tweak can't quietly land on two of the three pages and
// not the third.
export const FILTER_SELECT_CLASSNAME =
  "mt-1 flex h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";
