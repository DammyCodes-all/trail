'use client';

import { FlowButton } from '@/components/ui/flow-button';

const FlowButtonDemo = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <FlowButton text="Flow Button" />
    </div>
  );
};

const demo = { FlowButtonDemo };

export default demo;