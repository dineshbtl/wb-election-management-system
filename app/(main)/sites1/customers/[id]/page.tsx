"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Collapse, Table, Spin, Button, message } from "antd";
import axios from "axios";

const { Panel } = Collapse;

export default function CustomerQuotationsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchQuotations();
  }, [id]);

  const fetchQuotations = async () => {
    try {
      const res = await axios.get(`/api/customer-quotations/${id}`);
      setQuotations(res.data || []);
    } catch (err) {
      message.error("Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">
          🧾 Quotations - {decodeURIComponent(id)}
        </h1>
        <Button onClick={() => router.back()}>⬅ Back</Button>
      </div>

      {quotations.length === 0 ? (
        <p className="text-gray-500 italic">
          No quotations found for this customer.
        </p>
      ) : (
        <Collapse accordion defaultActiveKey={quotations[0]?.name}>
          {quotations.map((q) => (
            <Panel
              key={q.name}
              header={
                <div className="flex justify-between w-full">
                  <span className="font-medium">{q.name}</span>
                  <span className="text-gray-500">
                    {q.transaction_date} | {q.status} | ₹{q.grand_total}
                  </span>
                </div>
              }
            >
              <div className="bg-white p-4 rounded-md shadow-sm">
                <p>
                  <b>Customer:</b> {q.customer_name}
                </p>
                <p>
                  <b>Status:</b> {q.status}
                </p>
                <p>
                  <b>Grand Total:</b> ₹{q.grand_total}
                </p>

                <h3 className="text-lg font-semibold mt-4 mb-2">Items</h3>
                <Table
                  dataSource={q.items || []}
                  rowKey="name"
                  pagination={false}
                  columns={[
                    { title: "Item", dataIndex: "item_name" },
                    { title: "Qty", dataIndex: "qty" },
                    { title: "Rate", dataIndex: "rate" },
                    { title: "Amount", dataIndex: "amount" },
                  ]}
                />
              </div>
            </Panel>
          ))}
        </Collapse>
      )}
    </div>
  );
}
