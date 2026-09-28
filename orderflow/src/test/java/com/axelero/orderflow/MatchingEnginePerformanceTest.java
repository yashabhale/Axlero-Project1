package com.axelero.orderflow;

import com.axelero.orderflow.model.OrderMessage;
import com.axelero.orderflow.service.MatchingEngineService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertTrue;

class MatchingEnginePerformanceTest {

    private static final int WARMUP_ORDERS = 10_000;
    private static final int MEASURED_ORDERS = 100_000;

    @Test
    void reportsCoreMatchingThroughputAndLatency() {
        MatchingEngineService service = new MatchingEngineService(payload -> true, new ObjectMapper());

        for (int index = 0; index < WARMUP_ORDERS; index++) {
            assertTrue(service.processOrder(order("warmup-" + index)));
        }

        long[] latencyNanos = new long[MEASURED_ORDERS];
        long startedAt = System.nanoTime();
        for (int index = 0; index < MEASURED_ORDERS; index++) {
            OrderMessage order = order("measure-" + index);
            long orderStartedAt = System.nanoTime();
            assertTrue(service.processOrder(order));
            latencyNanos[index] = System.nanoTime() - orderStartedAt;
        }
        long elapsedNanos = System.nanoTime() - startedAt;
        Arrays.sort(latencyNanos);

        double throughput = MEASURED_ORDERS * 1_000_000_000.0 / elapsedNanos;
        long p50Micros = latencyNanos[MEASURED_ORDERS / 2] / 1_000;
        long p99Micros = latencyNanos[(int) (MEASURED_ORDERS * 0.99)] / 1_000;
        System.out.printf("Core matching: %.0f orders/s, p50 %d us, p99 %d us%n", throughput, p50Micros, p99Micros);
    }

    private OrderMessage order(String id) {
        OrderMessage order = new OrderMessage();
        order.setSchemaVersion(1);
        order.setType("NEW_ORDER");
        order.setClientOrderId(id);
        order.setInstrumentId("PERF");
        order.setSide("BUY");
        order.setOrderType("LIMIT");
        order.setQuantity(1L);
        order.setLimitPrice(100_000L);
        order.setTimeInForce("GTC");
        order.setClientTimestamp("2026-09-28T00:00:00Z");
        return order;
    }
}