import React, { useState, useEffect } from "react";

interface MemoryItem {
  key: string;
  value: any;
}

export const MemoryPanel: React.FC = () => {
  const [searchValue, setSearchValue] = useState("");
  const [memoryData, setMemoryData] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMemoryData = async () => {
      try {
        const response = await fetch("http://localhost:3001/memory/sessions");
        if (!response.ok) {
          throw new Error("Failed to fetch memory data");
        }
        const data = await response.json();
        // Assuming the data is an object, convert it to an array of key-value pairs
        const formattedData = Object.entries(data).map(([key, value]) => ({
          key,
          value: JSON.stringify(value, null, 2),
        }));
        setMemoryData(formattedData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMemoryData();
  }, []);

  const filteredMemoryData = memoryData.filter((item) =>
    item.key.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-light">
          search
        </span>
        <input
          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-main focus:outline-0 focus:ring-1 focus:ring-primary border-border-light bg-background-dark h-10 placeholder:text-text-light pl-10 text-sm font-normal leading-normal"
          placeholder="Search memory..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>
      <div className="flex border-b border-border-light">
        <button className="px-4 py-2 text-sm font-medium text-primary border-b-2 border-primary">
          Short-term
        </button>
        <button className="px-4 py-2 text-sm font-medium text-text-light hover:text-text-main">
          Long-term
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {filteredMemoryData.map((item) => (
          <div
            key={item.key}
            className="p-3 rounded-lg bg-background-dark border border-border-light"
          >
            <p className="text-xs font-medium text-text-light uppercase mb-1">
              {item.key}
            </p>
            <pre className="text-sm text-text-main whitespace-pre-wrap">
              {item.value}
            </pre>
          </div>
        ))}
        {!loading && filteredMemoryData.length === 0 && (
          <p className="text-text-light text-sm p-2 text-center">
            No memory items found.
          </p>
        )}
      </div>
    </div>
  );
};
