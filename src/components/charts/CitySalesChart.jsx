"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';

const CitySalesChart = ({ data }) => {
  const chartData = data.map(item => ({
    name: `${item.city}/${item.uf}`,
    total: item.total,
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
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
          itemStyle={{ color: '#333' }}
        />
        <Bar dataKey="total" fill="#82ca9d" name="Total Vendas" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default CitySalesChart;