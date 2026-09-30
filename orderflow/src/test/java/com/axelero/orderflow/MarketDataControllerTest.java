package com.axelero.orderflow;

import com.axelero.orderflow.controller.OrderFlowController;
import com.axelero.orderflow.model.ExecutionEvent;
import com.axelero.orderflow.service.MatchingEngineService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.codec.ServerSentEvent;

import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MarketDataControllerTest {

    @Test
    void shouldExposeBookEndpoint() {
        MatchingEngineService service = new MatchingEngineService(payload -> true, new ObjectMapper());
        OrderFlowController controller = new OrderFlowController(service);

        assertEquals(200, controller.getBook("ACME").getStatusCode().value());
    }

    @Test
    void shouldStreamTradeEventsAsServerSentEvents() {
        MatchingEngineService service = new MatchingEngineService(payload -> true, new ObjectMapper());
        OrderFlowController controller = new OrderFlowController(service);
        service.processOrder(order("sell", "SELL", 10L, 100_000L));
        service.processOrder(order("buy", "BUY", 10L, 100_000L));
        ServerSentEvent<ExecutionEvent> event = controller.streamExecutions("ACME").blockFirst();

        assertNotNull(event);
        assertEquals("trade", event.event());
        assertEquals(100_000L, event.data().getMatchPrice());
    }

    @Test
    void shouldStreamInitialAndUpdatedBookSnapshotsAsServerSentEvents() {
        MatchingEngineService service = new MatchingEngineService(payload -> true, new ObjectMapper());
        OrderFlowController controller = new OrderFlowController(service);
        CopyOnWriteArrayList<ServerSentEvent<Map<String, Object>>> events = new CopyOnWriteArrayList<>();
        CountDownLatch initialSnapshot = new CountDownLatch(1);
        CountDownLatch updatedSnapshot = new CountDownLatch(1);
        reactor.core.Disposable subscription = controller.streamBookSnapshots("ACME").subscribe(event -> {
            events.add(event);
            if (events.size() == 1) {
                initialSnapshot.countDown();
            } else {
                updatedSnapshot.countDown();
            }
        });

        try {
            assertTrue(initialSnapshot.await(1, TimeUnit.SECONDS));
            assertEquals("book", events.get(0).event());
            assertTrue(((Map<?, ?>) events.get(0).data().get("bids")).isEmpty());

            service.processOrder(order("buy-book", "BUY", 10L, 100_000L));

            assertTrue(updatedSnapshot.await(1, TimeUnit.SECONDS));
            assertTrue(((Map<?, ?>) events.get(1).data().get("bids")).containsKey("100000"));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AssertionError("Interrupted while waiting for book snapshots", e);
        } finally {
            subscription.dispose();
        }
    }

    private com.axelero.orderflow.model.OrderMessage order(String id, String side, long quantity, long price) {
        com.axelero.orderflow.model.OrderMessage order = new com.axelero.orderflow.model.OrderMessage();
        order.setSchemaVersion(1);
        order.setType("NEW_ORDER");
        order.setClientOrderId(id);
        order.setInstrumentId("ACME");
        order.setSide(side);
        order.setOrderType("LIMIT");
        order.setQuantity(quantity);
        order.setLimitPrice(price);
        order.setTimeInForce("GTC");
        order.setClientTimestamp("2026-09-28T00:00:00Z");
        return order;
    }
}
