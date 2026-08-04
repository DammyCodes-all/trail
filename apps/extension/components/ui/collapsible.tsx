import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

import { cn } from "@/lib/utils";

function Collapsible(props: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root {...props} />;
}

function CollapsibleTrigger(props: CollapsiblePrimitive.Trigger.Props) {
  return <CollapsiblePrimitive.Trigger {...props} />;
}

function CollapsibleContent({
  className,
  ...props
}: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      className={cn(
        "h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] data-starting-style:h-0 data-starting-style:opacity-0 data-ending-style:h-0 data-ending-style:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
