"use client";

import { useEffect, useState } from "react";
import { Input, Table, Button, Select, Spin, message, Collapse } from "antd";
import axios from "axios";
import { useRouter } from "next/navigation";

const { Panel } = Collapse;

const PAGE_SIZES = [
  { label: "20", value: 20 },
  { label: "100", value: 100 },
  { label: "All (2500+)", value: 2500 },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [quotationLoading, setQuotationLoading] = useState(false);

  const router = useRouter();

  // 🔹 Fetch customers from ERPNext
  const fetchCustomers = async (reset = false) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/customers?search=${encodeURIComponent(
          search
        )}&start=${offset}&limit=${limit}`
      );
      const data = await res.json();
      const newData = data?.customers || [];
      if (reset) {
        setCustomers(newData);
        setTotal(newData.length);
      } else {
        setCustomers((prev) => [...prev, ...newData]);
        setTotal((prev) => prev + newData.length);
      }
      setHasMore(newData.length === limit);
    } catch (err) {
      console.error("❌ Error fetching customers:", err);
      message.error("Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(true);
  }, [limit]);

  const handleSearch = () => {
    setOffset(0);
    fetchCustomers(true);
  };

  const handleLoadMore = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchCustomers();
  };

  // 🔹 Fetch quotations for selected customer
  const fetchQuotations = async (customerName: string) => {
    setQuotationLoading(true);
    setSelectedCustomer(customerName);
    try {
      const res = await axios.get(
        `/api/quotations?customer=${encodeURIComponent(customerName)}`
      );
      const data = res.data?.data || [];
      setQuotations(data);
      if (data.length === 0) {
        message.info("No quotations found for this customer.");
      }
    } catch (error) {
      console.error("❌ Error fetching quotations:", error);
      message.error("Failed to load quotations.");
    } finally {
      setQuotationLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">
          ERP Customers ({total})
        </h1>

        <div className="flex items-center gap-3">
          <Input.Search
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={handleSearch}
            enterButton
            allowClear
            style={{ width: 250 }}
          />
          <Select
            value={limit}
            onChange={(value) => {
              setLimit(value);
              setOffset(0);
              fetchCustomers(true);
            }}
            options={PAGE_SIZES}
            style={{ width: 140 }}
          />
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-lg shadow">
        {loading && customers.length === 0 ? (
          <div className="flex justify-center items-center py-10">
            <Spin size="large" />
          </div>
        ) : (
          <Table
            dataSource={customers || []}
            rowKey="name"
            pagination={false}
            onRow={(record) => ({
              onClick: () => fetchQuotations(record.customer_name),
            })}
            columns={[
              {
                title: "Customer Name",
                dataIndex: "customer_name",
                key: "customer_name",
                render: (text, record) => (
                  <span
                    onClick={() =>
                      router.push(
                        `/sites1/customers/${encodeURIComponent(
                          record.customer_name
                        )}`
                      )
                    }
                    className="text-blue-600 hover:underline cursor-pointer"
                  >
                    {text}
                  </span>
                ),
              },
              {
                title: "Mobile",
                dataIndex: "mobile_no",
                key: "mobile_no",
                render: (text) => text || "—",
              },
              {
                title: "Email",
                dataIndex: "email_id",
                key: "email_id",
                render: (text) => text || "—",
              },
              {
                title: "GSTIN",
                dataIndex: "gstin",
                key: "gstin",
                render: (text) => text || "—",
              },
              {
                title: "Created On",
                dataIndex: "creation",
                key: "creation",
                render: (text) =>
                  text ? new Date(text).toLocaleDateString() : "—",
              },
            ]}
          />
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button
            onClick={handleLoadMore}
            loading={loading}
            disabled={loading}
            type="primary"
          >
            Load More ({customers.length}/{total || "?"})
          </Button>
        </div>
      )}

      {/* Quotation Details */}
      {selectedCustomer && (
        <div className="mt-8 bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3 text-gray-800">
            Quotations for: {selectedCustomer}
          </h2>

          {quotationLoading ? (
            <div className="flex justify-center py-6">
              <Spin size="large" />
            </div>
          ) : quotations.length > 0 ? (
            <Collapse accordion>
              {quotations.map((q: any) => (
                <Panel
                  header={`${q.name} — ${q.status} — ₹${q.grand_total}`}
                  key={q.name}
                >
                  <p>
                    <strong>Date:</strong> {q.transaction_date}
                  </p>
                  <p>
                    <strong>Total:</strong> ₹{q.grand_total}
                  </p>

                  {/* Items Table */}
                  <Table
                    dataSource={q.items || []}
                    rowKey="item_code"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: "Item",
                        dataIndex: "item_name",
                        key: "item_name",
                      },
                      { title: "Qty", dataIndex: "qty", key: "qty" },
                      { title: "UOM", dataIndex: "uom", key: "uom" },
                      {
                        title: "Rate",
                        dataIndex: "rate",
                        key: "rate",
                        render: (r) => `₹${r}`,
                      },
                      {
                        title: "Amount",
                        dataIndex: "amount",
                        key: "amount",
                        render: (a) => `₹${a}`,
                      },
                    ]}
                  />
                </Panel>
              ))}
            </Collapse>
          ) : (
            <p className="text-gray-500 italic">No quotations found.</p>
          )}
        </div>
      )}
    </div>
  );
}
