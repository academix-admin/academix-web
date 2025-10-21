import React from 'react';

export default async function Quiz({ params }: { params: Promise<{ poolsId: string }> }) {
  const { poolsId } = await params;

  return (
    <div>
      <h1>Quiz ID: {poolsId}</h1>
    </div>
  );
}
