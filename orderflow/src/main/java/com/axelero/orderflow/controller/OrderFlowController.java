package com.axelero.orderflow.controller;

import com.axelero.orderflow.model.OrderMessage;
import com.axelero.orderflow.service.MatchingEngineService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class OrderFlowController {

    private final MatchingEngineService matchingEngineService;

    public OrderFlowController(MatchingEngineService matchingEngineService) {
        this.matchingEngineService = matchingEngineService;
    }

    @PostMapping("/orders")
    public ResponseEntity<Map<String, Object>> submitOrder(@RequestBody OrderMessage order) {
        try {
            order.setClientTimestamp(order.getClientTimestamp() == null ? Instant.now().toString() : order.getClientTimestamp());
            boolean accepted = matchingEngineService.processOrder(order);

            if (!accepted) {
                return ResponseEntity.accepted().body(Map.of(
                        "status", "REJECTED",
                        "reason", "Message broker rejected the order"
                ));
            }

            return ResponseEntity.accepted().body(Map.of(
                    "status", "ACCEPTED",
                    "clientOrderId", order.getClientOrderId(),
                    "instrumentId", order.getInstrumentId(),
                    "side", order.getSide(),
                    "orderType", order.getOrderType()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "INVALID",
                    "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }

    @GetMapping("/book/{instrumentId}")
    public ResponseEntity<Map<String, Object>> getBook(@PathVariable String instrumentId) {
        return ResponseEntity.ok(matchingEngineService.getBookSnapshot(instrumentId));
    }

    @GetMapping("/orders/{clientOrderId}/status")
    public ResponseEntity<Map<String, Object>> getStatus(@PathVariable String clientOrderId) {
        MatchingEngineService.OrderStatus status = matchingEngineService.getOrderStatus(clientOrderId);
        return ResponseEntity.ok(Map.of(
                "clientOrderId", status.getClientOrderId(),
                "instrumentId", status.getInstrumentId(),
                "side", status.getSide(),
                "status", status.getStatus(),
                "quantity", status.getQuantity()
        ));
    }

    @GetMapping("/executions/{instrumentId}")
    public ResponseEntity<java.util.List<Map<String, Object>>> getExecutions(@PathVariable String instrumentId) {
        java.util.List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (var event : matchingEngineService.getExecutionFeed(instrumentId)) {
            result.add(Map.of(
                    "eventType", event.getEventType(),
                    "instrumentId", event.getInstrumentId(),
                    "matchPrice", event.getMatchPrice(),
                    "quantity", event.getQuantity(),
                    "buyOrderId", event.getBuyOrderId(),
                    "sellOrderId", event.getSellOrderId(),
                    "eventTime", event.getEventTime()));
        }
        return ResponseEntity.ok(result);
    }
}
