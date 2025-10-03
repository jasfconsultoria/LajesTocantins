"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';

const ClientSalesChart = ({ data }) => {
  const chartData = data.map(item => ({
    name: item.name.length > 15 ? item.name.substring(0, 12) + '...' : item.name, // Truncate long names
    total: item.total,
    fullName: item.name, // Store full name for tooltip
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        margin={{
          top: 5,
          right: 10,
          left: 10,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="name" stroke="#666" tick={{ fontSize: 10 }} />
        <YAxis stroke="#666" tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 10 }} />
        <Tooltip 
          formatter={(value) => formatCurrency(value)}
          labelFormatter={(label, payload) => payload[0] ? payload[0].payload.fullName : label}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
          itemStyle={{ color: '#333' }}
        />
        <Bar dataKey="total" fill="#8884d8" name="Total Vendas" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ClientSalesChart;