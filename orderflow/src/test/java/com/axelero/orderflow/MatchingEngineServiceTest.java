package com.axelero.orderflow;

import com.axelero.orderflow.config.AeronConfig.MessagePublisher;
import com.axelero.orderflow.model.OrderMessage;
import com.axelero.orderflow.service.MatchingEngineService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MatchingEngineServiceTest {

    @Test
    void shouldAcceptBuyOrderAndMatchAgainstSellBook() {
        MessagePublisher publisher = payload -> true;

        MatchingEngineService service = new MatchingEngineService(publisher, new ObjectMapper());

        OrderMessage sell = new OrderMessage();
        sell.setSchemaVersion(1);
        sell.setType("NEW_ORDER");
        sell.setClientOrderId("sell-1");
        sell.setInstrumentId("ACME");
        sell.setSide("SELL");
        sell.setOrderType("LIMIT");
        sell.setQuantity(100L);
        sell.setLimitPrice(100000L);
        sell.setTimeInForce("GTC");
        sell.setClientTimestamp("2026-09-27T10:20:00.000Z");

        OrderMessage buy = new OrderMessage();
        buy.setSchemaVersion(1);
        buy.setType("NEW_ORDER");
        buy.setClientOrderId("buy-1");
        buy.setInstrumentId("ACME");
        buy.setSide("BUY");
        buy.setOrderType("LIMIT");
        buy.setQuantity(50L);
        buy.setLimitPrice(101000L);
        buy.setTimeInForce("GTC");
        buy.setClientTimestamp("2026-09-27T10:20:01.000Z");

        assertDoesNotThrow(() -> service.processOrder(sell));
        assertDoesNotThrow(() -> service.processOrder(buy));
    }

    @Test
    void shouldHonorBestPriceAndPartialFill() {
        final java.util.concurrent.atomic.AtomicInteger publishCount = new java.util.concurrent.atomic.AtomicInteger();
        MessagePublisher publisher = payload -> {
            publishCount.incrementAndGet();
            return true;
        };

        MatchingEngineService service = new MatchingEngineService(publisher, new ObjectMapper());

        OrderMessage sell1 = new OrderMessage();
        sell1.setSchemaVersion(1);
        sell1.setType("NEW_ORDER");
        sell1.setClientOrderId("sell-1");
        sell1.setInstrumentId("ACME");
        sell1.setSide("SELL");
        sell1.setOrderType("LIMIT");
        sell1.setQuantity(100L);
        sell1.setLimitPrice(100100L);
        sell1.setTimeInForce("GTC");
        sell1.setClientTimestamp("2026-09-27T10:20:00.000Z");

        OrderMessage sell2 = new OrderMessage();
        sell2.setSchemaVersion(1);
        sell2.setType("NEW_ORDER");
        sell2.setClientOrderId("sell-2");
        sell2.setInstrumentId("ACME");
        sell2.setSide("SELL");
        sell2.setOrderType("LIMIT");
        sell2.setQuantity(100L);
        sell2.setLimitPrice(100000L);
        sell2.setTimeInForce("GTC");
        sell2.setClientTimestamp("2026-09-27T10:20:01.000Z");

        OrderMessage buy = new OrderMessage();
        buy.setSchemaVersion(1);
        buy.setType("NEW_ORDER");
        buy.setClientOrderId("buy-1");
        buy.setInstrumentId("ACME");
        buy.setSide("BUY");
        buy.setOrderType("LIMIT");
        buy.setQuantity(150L);
        buy.setLimitPrice(101000L);
        buy.setTimeInForce("GTC");
        buy.setClientTimestamp("2026-09-27T10:20:02.000Z");

        service.processOrder(sell1);
        service.processOrder(sell2);
        service.processOrder(buy);

        assertEquals(2, publishCount.get(), "Expected one trade for first partial fill and one for second remaining quantity");
    }

    @Test
    void shouldTrackOrderStatusAndBookSnapshot() {
        MessagePublisher publisher = payload -> true;
        MatchingEngineService service = new MatchingEngineService(publisher, new ObjectMapper());

        OrderMessage buy = new OrderMessage();
        buy.setSchemaVersion(1);
        buy.setType("NEW_ORDER");
        buy.setClientOrderId("buy-100");
        buy.setInstrumentId("ACME");
        buy.setSide("BUY");
        buy.setOrderType("LIMIT");
        buy.setQuantity(90L);
        buy.setLimitPrice(101500L);
        buy.setTimeInForce("GTC");
        buy.setClientTimestamp("2026-09-27T10:24:00.000Z");

        service.processOrder(buy);

        assertEquals("LIVE", service.getOrderStatus("buy-100").getStatus());
        assertTrue(service.getBookSnapshot("ACME").containsKey("bids"));
    }

    @Test
    void shouldUpdateLifecycleOnPartialFillAndExposeExecutionStream() {
        MessagePublisher publisher = payload -> true;
        MatchingEngineService service = new MatchingEngineService(publisher, new ObjectMapper());

        OrderMessage sell = new OrderMessage();
        sell.setSchemaVersion(1);
        sell.setType("NEW_ORDER");
        sell.setClientOrderId("sell-100");
        sell.setInstrumentId("ACME");
        sell.setSide("SELL");
        sell.setOrderType("LIMIT");
        sell.setQuantity(100L);
        sell.setLimitPrice(100000L);
        sell.setTimeInForce("GTC");
        sell.setClientTimestamp("2026-09-27T10:25:00.000Z");

        OrderMessage buy = new OrderMessage();
        buy.setSchemaVersion(1);
        buy.setType("NEW_ORDER");
        buy.setClientOrderId("buy-200");
        buy.setInstrumentId("ACME");
        buy.setSide("BUY");
        buy.setOrderType("LIMIT");
        buy.setQuantity(150L);
        buy.setLimitPrice(101000L);
        buy.setTimeInForce("GTC");
        buy.setClientTimestamp("2026-09-27T10:25:01.000Z");

        service.processOrder(sell);
        service.processOrder(buy);

        assertEquals("PARTIALLY_FILLED", service.getOrderStatus("buy-200").getStatus());
        assertFalse(service.getExecutionFeed("ACME").isEmpty());
    }
}
