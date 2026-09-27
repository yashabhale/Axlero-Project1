package com.axelero.orderflow.service;

import com.axelero.orderflow.config.AeronConfig.MessagePublisher;
import com.axelero.orderflow.model.ExecutionEvent;
import com.axelero.orderflow.model.OrderMessage;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.Deque;
import java.util.Map;
import java.util.NavigableMap;
import java.util.TreeMap;
import java.util.ArrayDeque;
import java.util.HashMap;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MatchingEngineService {

    private final MessagePublisher orderPublisher;
    private final ObjectMapper objectMapper;
    private final Map<String, OrderBook> orderBooks = new ConcurrentHashMap<>();
    private final Map<String, OrderStatus> orderStatuses = new ConcurrentHashMap<>();

    public MatchingEngineService(MessagePublisher orderPublisher, ObjectMapper objectMapper) {
        this.orderPublisher = orderPublisher;
        this.objectMapper = objectMapper;
    }

    public boolean processOrder(OrderMessage order) {
        order.validate();
        OrderBook orderBook = orderBooks.computeIfAbsent(order.getInstrumentId(), key -> new OrderBook());
        OrderStatus status = new OrderStatus(order.getClientOrderId(), order.getInstrumentId(), order.getSide(), "NEW", order.getQuantity());
        orderStatuses.put(order.getClientOrderId(), status);
        boolean accepted = orderBook.process(order);
        if (accepted) {
            status.setStatus("LIVE");
        }
        return accepted;
    }

    public OrderStatus getOrderStatus(String clientOrderId) {
        return orderStatuses.getOrDefault(clientOrderId, new OrderStatus(clientOrderId, "UNKNOWN", "UNKNOWN", "NOT_FOUND", 0L));
    }

    public Map<String, Object> getBookSnapshot(String instrumentId) {
        Map<String, Object> snapshot = new HashMap<>();
        OrderBook orderBook = orderBooks.get(instrumentId);
        if (orderBook == null) {
            snapshot.put("bids", Map.of());
            snapshot.put("asks", Map.of());
            return snapshot;
        }
        snapshot.put("bids", orderBook.bidsSnapshot());
        snapshot.put("asks", orderBook.asksSnapshot());
        return snapshot;
    }

    private void publishExecution(OrderMessage incoming, OrderMessage resting, long matchPrice, long tradeQty) {
        String buyOrderId = "BUY".equalsIgnoreCase(incoming.getSide()) ? incoming.getClientOrderId() : resting.getClientOrderId();
        String sellOrderId = "SELL".equalsIgnoreCase(incoming.getSide()) ? incoming.getClientOrderId() : resting.getClientOrderId();

        ExecutionEvent event = ExecutionEvent.of(
                "TRADE",
                incoming.getInstrumentId(),
                matchPrice,
                tradeQty,
                buyOrderId,
                sellOrderId);

        try {
            orderPublisher.publish(objectMapper.writeValueAsBytes(event));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize execution event", e);
        }
    }

    public static class OrderStatus {
        private final String clientOrderId;
        private final String instrumentId;
        private final String side;
        private String status;
        private Long quantity;

        public OrderStatus(String clientOrderId, String instrumentId, String side, String status, Long quantity) {
            this.clientOrderId = clientOrderId;
            this.instrumentId = instrumentId;
            this.side = side;
            this.status = status;
            this.quantity = quantity;
        }

        public String getClientOrderId() { return clientOrderId; }
        public String getInstrumentId() { return instrumentId; }
        public String getSide() { return side; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public Long getQuantity() { return quantity; }
        public void setQuantity(Long quantity) { this.quantity = quantity; }
    }

    private final class OrderBook {
        private final NavigableMap<Long, Deque<OrderMessage>> bids = new TreeMap<>(Comparator.reverseOrder());
        private final NavigableMap<Long, Deque<OrderMessage>> asks = new TreeMap<>();

        public Map<String, Object> bidsSnapshot() {
            Map<String, Object> snapshot = new HashMap<>();
            bids.forEach((price, queue) -> snapshot.put(String.valueOf(price), queue.stream().map(OrderMessage::getQuantity).toList()));
            return snapshot;
        }

        public Map<String, Object> asksSnapshot() {
            Map<String, Object> snapshot = new HashMap<>();
            asks.forEach((price, queue) -> snapshot.put(String.valueOf(price), queue.stream().map(OrderMessage::getQuantity).toList()));
            return snapshot;
        }

        public boolean process(OrderMessage order) {
            if ("BUY".equalsIgnoreCase(order.getSide())) {
                return processBuy(order);
            }
            return processSell(order);
        }

        private boolean processBuy(OrderMessage order) {
            while (order.getQuantity() != null && order.getQuantity() > 0 && !asks.isEmpty()) {
                Map.Entry<Long, Deque<OrderMessage>> bestAsk = asks.firstEntry();
                if (bestAsk == null || order.getLimitPrice() == null || order.getLimitPrice() < bestAsk.getKey()) {
                    break;
                }

                Deque<OrderMessage> queue = bestAsk.getValue();
                OrderMessage resting = queue.peekFirst();
                if (resting == null) {
                    asks.pollFirstEntry();
                    continue;
                }

                long tradeQty = Math.min(resting.getQuantity(), order.getQuantity());
                long matchPrice = bestAsk.getKey();
                publishExecution(order, resting, matchPrice, tradeQty);

                resting.setQuantity(resting.getQuantity() - tradeQty);
                order.setQuantity(order.getQuantity() - tradeQty);

                if (resting.getQuantity() <= 0) {
                    queue.pollFirst();
                    if (queue.isEmpty()) {
                        asks.pollFirstEntry();
                    }
                }
            }

            if (order.getQuantity() != null && order.getQuantity() > 0) {
                addOrderToBook(bids, order.getLimitPrice(), order);
            }
            return true;
        }

        private boolean processSell(OrderMessage order) {
            while (order.getQuantity() != null && order.getQuantity() > 0 && !bids.isEmpty()) {
                Map.Entry<Long, Deque<OrderMessage>> bestBid = bids.firstEntry();
                if (bestBid == null || order.getLimitPrice() == null || order.getLimitPrice() > bestBid.getKey()) {
                    break;
                }

                Deque<OrderMessage> queue = bestBid.getValue();
                OrderMessage resting = queue.peekFirst();
                if (resting == null) {
                    bids.pollFirstEntry();
                    continue;
                }

                long tradeQty = Math.min(resting.getQuantity(), order.getQuantity());
                long matchPrice = bestBid.getKey();
                publishExecution(order, resting, matchPrice, tradeQty);

                resting.setQuantity(resting.getQuantity() - tradeQty);
                order.setQuantity(order.getQuantity() - tradeQty);

                if (resting.getQuantity() <= 0) {
                    queue.pollFirst();
                    if (queue.isEmpty()) {
                        bids.pollFirstEntry();
                    }
                }
            }

            if (order.getQuantity() != null && order.getQuantity() > 0) {
                addOrderToBook(asks, order.getLimitPrice(), order);
            }
            return true;
        }

        private void addOrderToBook(NavigableMap<Long, Deque<OrderMessage>> book, Long price, OrderMessage order) {
            Deque<OrderMessage> level = book.computeIfAbsent(price, key -> new ArrayDeque<>());
            level.addLast(order);
        }
    }
}
